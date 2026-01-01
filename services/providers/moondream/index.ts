export * from './types';
export * from './api';
export * from './MoondreamCloudProvider';
export * from './MoondreamLocalProvider';

import { registry } from '../../providerRegistry';
import { MoondreamLocalProvider } from './MoondreamLocalProvider';
import { MoondreamCloudProvider } from './MoondreamCloudProvider';

// Register providers to ensure they are available to the application
registry.register(new MoondreamLocalProvider());
registry.register(new MoondreamCloudProvider());
