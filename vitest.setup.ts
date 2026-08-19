import { beforeAll } from 'vitest';

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
