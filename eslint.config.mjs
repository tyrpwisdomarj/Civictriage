import firebaseSecurityRules from '@firebase/eslint-plugin-security-rules';

const recommended = firebaseSecurityRules.configs['flat/recommended'];
const recommendedConfigs = Array.isArray(recommended) ? recommended : [recommended];

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  ...recommendedConfigs,
];
