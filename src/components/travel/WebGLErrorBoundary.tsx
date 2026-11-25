import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface WebGLCapabilities {
  supported: boolean;
  isSoftwareGl: boolean;
  rendererName: string;
}

const SOFTWARE_RENDERER_REGEX =
  /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Mesa OffScreen/i;

export function detectWebGLCapabilities(): WebGLCapabilities {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: false, rendererName: 'SSR' };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return { supported: false, isSoftwareGl: false, rendererName: 'Unavailable' };
    }

    let rendererName = 'WebGL';
    try {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const unmasked = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (typeof unmasked === 'string' && unmasked.trim()) {
          rendererName = unmasked.trim();
        }
      }
    } catch {
      // Ignore restricted renderer string queries
    }

    const isSoftwareGl = SOFTWARE_RENDERER_REGEX.test(rendererName);
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    return { supported: true, isSoftwareGl, rendererName };
  } catch {
    return { supported: false, isSoftwareGl: false, rendererName: 'Error' };
  }
}

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  fallback: (errorMessage: string | null, onRetry: () => void) => ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  state: WebGLErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): WebGLErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || '3D WebGL renderer encountered an unexpected error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WebGLErrorBoundary] Falling back to 2D SVG map:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.errorMessage, this.handleRetry);
    }
    return this.props.children;
  }
}
