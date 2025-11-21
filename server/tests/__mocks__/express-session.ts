// Mock for express-session in tests
export default jest.fn(() => (req: any, res: any, next: any) => {
  req.session = {
    id: 'test-session-id',
    cookie: {},
    regenerate: jest.fn((callback) => callback()),
    destroy: jest.fn((callback) => callback()),
    reload: jest.fn((callback) => callback()),
    save: jest.fn((callback) => callback()),
    touch: jest.fn(() => {})
  };
  next();
});