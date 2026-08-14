# 好测试与坏测试

## 好测试

**集成风格**：通过真实接口测试，而不是 mock 内部部件。

```typescript
// 好：测试可观察的行为
test('user can checkout with valid cart', async () => {
  const cart = createCart()
  cart.add(product)
  const result = await checkout(cart, paymentMethod)
  expect(result.status).toBe('confirmed')
})
```

特征：

- 测试用户/调用者在意的行为
- 只使用公开 API
- 能扛住内部重构
- 描述 WHAT（做什么），而不是 HOW（怎么做）
- 每个测试只有一个逻辑断言

## 坏测试

**实现细节测试**：与内部结构耦合。

```typescript
// 坏：测试实现细节
test('checkout calls paymentService.process', async () => {
  const mockPayment = jest.mock(paymentService)
  await checkout(cart, payment)
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total)
})
```

危险信号：

- Mock 内部协作对象
- 测试私有方法
- 断言调用次数/顺序
- 行为没变，但重构时测试就挂
- 测试名描述 HOW 而不是 WHAT
- 通过外部手段验证，而不是通过接口

```typescript
// 坏：绕过接口去验证
test('createUser saves to database', async () => {
  await createUser({ name: 'Alice' })
  const row = await db.query('SELECT * FROM users WHERE name = ?', ['Alice'])
  expect(row).toBeDefined()
})

// 好：通过接口验证
test('createUser makes user retrievable', async () => {
  const user = await createUser({ name: 'Alice' })
  const retrieved = await getUser(user.id)
  expect(retrieved.name).toBe('Alice')
})
```
