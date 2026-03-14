import { getEnvVars } from 'expo-env';

const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } = getEnvVars();

export { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME };
