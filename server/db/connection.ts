import { createPool, type Pool } from '@jeffrey-keyser/database-base-config';
import config from '../config/env';

const pool: Pool = createPool(config.databaseConfig);

export default pool; 