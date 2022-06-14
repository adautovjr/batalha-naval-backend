import { DEFAULT_VARIABLE } from '@config/index'

test('Config import should be ok', () => { 
  expect(DEFAULT_VARIABLE).toEqual(true)
})