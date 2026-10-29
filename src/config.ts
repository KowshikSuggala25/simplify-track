import { Platform } from 'react-native';

export const API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:4010' : 'http://10.0.2.2:4010';
export const CACHE_KEY = '@simplify-track/cache-v1';
