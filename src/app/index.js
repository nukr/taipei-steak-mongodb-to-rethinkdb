import rethinkdbdash from 'rethinkdbdash'
import { MongoClient } from 'mongodb'

const RETHINKDB_HOST = process.env.RETHINKDB_HOST || '192.168.99.100'
const MONGODB_HOST = process.env.MONGODB_HOST || '192.168.99.100'

const RETHINKDB_PORT = process.env.RETHINKDB_PORT || '28015'
const MONGODB_PORT = process.env.MONGODB_PORT || '27017'

const r = rethinkdbdash({host: RETHINKDB_HOST, port: RETHINKDB_PORT})

function mongoConnect (url) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) return reject(err)
      resolve(db)
    })
  })
}

;(async () => {
  // make sure db exist
  await r.branch(
    r.dbList().contains('taipei_steak'),
    null,
    r.dbCreate('taipei_steak')
  )

  // make sure meals table exist and empty
  await r.branch(
    r.db('taipei_steak').tableList().contains('meals'),
    r.db('taipei_steak').table('meals').delete(),
    r.db('taipei_steak').tableCreate('meals')
  )

  // make sure orders table exist and empty
  await r.branch(
    r.db('taipei_steak').tableList().contains('orders'),
    r.db('taipei_steak').table('orders').delete(),
    r.db('taipei_steak').tableCreate('orders')
  )
  const mongodb = await mongoConnect(`mongodb://${MONGODB_HOST}:${MONGODB_PORT}/taipei_steak`)

  let mealCollection = mongodb.collection('meals')
  let meals = await new Promise((resolve, reject) => {
    mealCollection.find({}).toArray((err, docs) => {
      if (err) return reject(err)
      resolve(docs)
    })
  })

  let mealsInsertPromise =
        meals.map(
          meal => {
            delete meal._id
            delete meal.__v
            meal.createdAt = new Date()
            meal.updatedAt = new Date()
            return r
              .db('taipei_steak')
              .table('meals')
              .insert(meal)
          }
        )
  await Promise.all(mealsInsertPromise)

  let billsCollection = mongodb.collection('bills')

  let bills = await new Promise((resolve, reject) => {
    billsCollection.find({}).toArray((err, docs) => {
      if (err) return reject(err)
      resolve(docs)
    })
  })

  let billsInsertPromise =
        bills.map(
          bill => {
            delete bill._id
            delete bill.__v
            bill.createdAt = new Date(bill.orderTime)
            bill.updatedAt = new Date(bill.orderTime)
            delete bill.orderTime
            bill.items = bill.dishes.map(dish => {
              delete dish._id
              delete dish.__v
              return dish
            })
            bill.discount ? bill.discount = 0.12 : bill.discount = 0
            delete bill.dishes
            return r
              .db('taipei_steak')
              .table('orders')
              .insert(bill)
          }
        )
  await Promise.all(billsInsertPromise)
  await r.branch(
    r.db('taipei_steak').table('orders').indexList().contains('createdAt'),
    null,
    r.db('taipei_steak').table('orders').indexCreate('createdAt')
  )
  await r.branch(
    r.db('taipei_steak').table('orders').indexList().contains('updatedAt'),
    null,
    r.db('taipei_steak').table('orders').indexCreate('updatedAt')
  )
  await r.branch(
    r.db('taipei_steak').table('meals').indexList().contains('createdAt'),
    null,
    r.db('taipei_steak').table('meals').indexCreate('createdAt')
  )
  await r.branch(
    r.db('taipei_steak').table('meals').indexList().contains('updatedAt'),
    null,
    r.db('taipei_steak').table('meals').indexCreate('updatedAt')
  )
  console.log('done')
})().catch(console.log)
