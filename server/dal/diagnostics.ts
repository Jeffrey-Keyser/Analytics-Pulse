import { HealthCheckDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

const healthDal = new HealthCheckDal(pool);

const healthCheck = async (): Promise<any> => {
  try {
    const result = await healthDal.healthCheck();
    return result;
  } catch (error) {
    throw new Error('Database connection failed');
  }
};

export default healthCheck; 