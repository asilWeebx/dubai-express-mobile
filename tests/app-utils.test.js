const test = require('node:test')
const assert = require('node:assert/strict')

const { matchProductsByIds } = require('../app-utils.js')

test('matches numeric top-product IDs to string product IDs', () => {
  const products = [{ id: '12', name: 'Phone' }]

  assert.deepEqual(matchProductsByIds([12], products), [products[0]])
})

test('matches string top-product IDs to numeric product IDs', () => {
  const products = [{ id: 12, name: 'Phone' }]

  assert.deepEqual(matchProductsByIds(['12'], products), [products[0]])
})

test('keeps ranking order and skips unknown IDs', () => {
  const products = [
    { id: 1, name: 'First' },
    { id: '2', name: 'Second' },
  ]

  assert.deepEqual(matchProductsByIds(['2', 'missing', 1], products), [products[1], products[0]])
})
