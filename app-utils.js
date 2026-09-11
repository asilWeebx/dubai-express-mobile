(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  root.AppUtils = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  const normalizeProductId = id => id == null ? null : String(id)

  function matchProductsByIds(ids, products) {
    const byId = new Map()
    ;(products || []).forEach(product => {
      const id = normalizeProductId(product && product.id)
      if (id !== null) byId.set(id, product)
    })

    return (ids || [])
      .map(id => byId.get(normalizeProductId(id)))
      .filter(Boolean)
  }

  return { matchProductsByIds }
})
