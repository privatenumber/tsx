console.log("Run me with 'tsx index.ts'!")
console.log("Hello from TypeScript!")

function add(a: number, b: number): number {
  return a + b
}
console.log("I can define add() with types!", add(100, 34))

interface Hello {
  world: string
}
const hi = { world: "Goodbye world!" } satisfies Hello
console.log("This satisfies the Hello interface:", hi)

console.log("Look! import.meta.url works!")
console.dir(import.meta.url)
