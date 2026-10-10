import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncedCart } from '../lib/synced-cart.ts'
import { applyCartOperation, presentCart } from '../lib/account-cart.ts'
import type { CartItem } from '../lib/cart.ts'

const item: CartItem = { slug:'remera', size:'M', qty:2, name:'Remera', price_cents:100, image_url:'', color:'#333' }
function setup() {
  const storage = new Map<string, string>()
  const remote = new Map<string, CartItem[]>()
  const receipts = new Set<string>()
  let offline = false
  let loseResponse = false
  const dependencies: Parameters<typeof createSyncedCart>[0] = {
    storage: {
      read:(key)=>storage.get(key)??null, write:(key,value)=>{storage.set(key,value)},
      remove:(key)=>{storage.delete(key)}, entries:(prefix)=>[...storage.entries()].filter(([key])=>key.startsWith(prefix)),
    },
    readRemote:async (owner: string)=>{if(offline) throw Error('offline');return remote.get(owner)??[]},
    mutateRemote:async (owner: string, op: Parameters<typeof applyCartOperation>[1])=>{
      if(offline) throw Error('offline')
      if(!receipts.has(owner+op.id)) {
        remote.set(owner,presentCart(applyCartOperation(remote.get(owner)??[],op),[item])); receipts.add(owner+op.id)
      }
      if (loseResponse) { loseResponse = false; throw Error('response lost') }
      return remote.get(owner)??[]
    },
  }
  const store = createSyncedCart(dependencies)
  return {store,storage,remote,reload:()=>createSyncedCart(dependencies),offline:(value:boolean)=>{offline=value},loseResponse:()=>{loseResponse=true}}
}
test('el invitado permanece local y al entrar se combina sin duplicar en siguientes sesiones',async()=>{
  const {store,remote}=setup()
  await store.setOwner(null)
  store.change('add',[item],[item]); assert.equal(remote.size,0)
  await store.setOwner('a'); assert.equal(remote.get('a')?.[0].qty,2)
  await store.setOwner(null); assert.deepEqual(store.getSnapshot().items,[])
  await store.setOwner('a'); assert.equal(store.getSnapshot().items[0].qty,2)
})
test('operaciones pendientes sobreviven a una recarga y se reintentan al recuperar conexión',async()=>{
  const f=setup(); await f.store.setOwner('a'); f.offline(true)
  f.store.change('add',[item],[item]); await f.store.refresh()
  assert.equal(f.store.getSnapshot().items[0].qty,2)
  assert.equal(f.store.getSnapshot().sync,'error')
  const reloaded = f.reload(); await reloaded.setOwner('a')
  assert.equal(reloaded.getSnapshot().items[0].qty,2)
  f.offline(false); await reloaded.refresh(); assert.equal(f.remote.get('a')?.[0].qty,2)
  await reloaded.refresh(); assert.equal(f.remote.get('a')?.[0].qty,2)
})
test('salir y cambiar de cuenta no muestra ni importa las prendas de la cuenta anterior',async()=>{
  const {store,remote}=setup(); remote.set('a',[item])
  await store.setOwner('a'); await store.setOwner('b')
  assert.deepEqual(store.getSnapshot().items,[])
  assert.deepEqual(remote.get('b')??[],[])
  await store.setOwner(null); assert.deepEqual(store.getSnapshot().items,[])
})
test('perder la respuesta tras guardar en servidor no duplica unidades al recargar y reintentar',async()=>{
  const f=setup(); await f.store.setOwner('a'); f.loseResponse()
  f.store.change('add',[item],[item]); await f.store.refresh()
  assert.equal(f.store.getSnapshot().sync,'error')
  assert.equal(f.remote.get('a')?.[0].qty,2)
  const reloaded=f.reload(); await reloaded.setOwner('a')
  assert.equal(reloaded.getSnapshot().items[0].qty,2)
  assert.equal(f.remote.get('a')?.[0].qty,2)
  assert.equal(reloaded.getSnapshot().sync,'saved')
})
test('las prendas que no caben al fusionar siguen disponibles como visitante',async()=>{
  const f=setup()
  f.remote.set('a',Array.from({length:50},(_,i)=>({...item,slug:`prenda-${i}`})))
  await f.store.setOwner(null); f.store.change('add',[item],[item])
  await f.store.setOwner('a')
  assert.equal(f.store.getSnapshot().items.length,50)
  assert.match(f.store.getSnapshot().warning??'',/límite/)
  await f.store.setOwner(null)
  assert.equal(f.store.getSnapshot().items[0].slug,item.slug)
})
test('una respuesta tardía de la cuenta anterior no modifica el carrito de la cuenta nueva',async()=>{
  let resolve!: (items:CartItem[])=>void
  const storage=new Map<string,string>()
  const store=createSyncedCart({
    storage:{read:(key)=>storage.get(key)??null,write:(key,value)=>{storage.set(key,value)},remove:(key)=>{storage.delete(key)},entries:()=>[]},
    readRemote:(owner)=>owner==='a'?new Promise(r=>{resolve=r}):Promise.resolve([]),
    mutateRemote:async()=>[],
  })
  const old=store.setOwner('a'); await store.setOwner('b'); resolve([item]); await old
  assert.equal(store.getSnapshot().owner,'b'); assert.deepEqual(store.getSnapshot().items,[])
})
