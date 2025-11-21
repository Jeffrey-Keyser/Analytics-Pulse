export default {
  hash: jest.fn((password: string, saltRounds: number) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password: string, hash: string) => Promise.resolve(hash === `hashed_${password}`)),
  genSalt: jest.fn((rounds: number) => Promise.resolve('salt')),
  hashSync: jest.fn((password: string, saltRounds: number) => `hashed_${password}`),
  compareSync: jest.fn((password: string, hash: string) => hash === `hashed_${password}`),
  genSaltSync: jest.fn((rounds: number) => 'salt')
};