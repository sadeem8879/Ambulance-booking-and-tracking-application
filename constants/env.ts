import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? (Constants.manifest as any)?.extra) ?? {};

export const ADMIN_USERNAME: string = (extra as any).ADMIN_USERNAME ?? 'sadeemadmin';
export const ADMIN_PASSWORD: string = (extra as any).ADMIN_PASSWORD ?? 'sadeem123';
export const ADMIN_EMAIL: string = (extra as any).ADMIN_EMAIL ?? 'youractualadminemail@gmail.com';

