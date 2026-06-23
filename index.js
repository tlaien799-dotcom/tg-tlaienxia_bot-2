require('dotenv').config()
const { Telegraf } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)

// ======================
const ADMIN_ID = 8363348721
// ======================

const users = {}
const blacklist = new Set()
const lastMsgTime = {}
let replyTarget = {}

// ======================
// 👉 随机验证码
// ======================
function generateQuestion() {
  const a = Math.floor(Math.random() * 10)
  const b = Math.floor(Math.random() * 10)
  return {
    q: `${a} + ${b} = ?`,
    a: String(a + b)
  }
}

// ======================
// 👉 /start
// ======================
bot.start((ctx) => {
  const id = ctx.from.id

  users[id] = {
    verified: false,
    question: generateQuestion()
  }

  ctx.reply(`🤖 请先验证：\n${users[id].question.q}`)
})

// ======================
// 👉 callback（按钮必须这个）
// ======================
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data
  const adminId = ctx.from.id

  if (data.startsWith('reply_')) {
    const userId = data.split('_')[1]

    replyTarget[adminId] = userId

    return ctx.reply(`✍️ 请输入回复内容（用户 ${userId}）：`)
  }
})

// ======================
// 👉 主逻辑（只保留一个！）
// ======================
bot.on('text', async (ctx) => {
  const id = ctx.from.id
  const text = ctx.message.text

  const username = ctx.from.username || "无用户名"
  const name = `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim()

  // ======================
  // ❗管理员回复（完全关闭验证）
  // ======================
  if (replyTarget[id]) {
    const targetId = replyTarget[id]

    await bot.telegram.sendMessage(
      targetId,
      `📩 客服回复：\n\n${text}`
    )

    await ctx.reply('✅ 已发送')
    delete replyTarget[id]
    return
  }

  // ======================
  // ❗黑名单
  // ======================
  if (blacklist.has(id)) {
    return ctx.reply('⛔ 你已被禁止使用')
  }

  // ======================
  // ❗防刷屏
  // ======================
  const now = Date.now()
  if (lastMsgTime[id] && now - lastMsgTime[id] < 3000) {
    return ctx.reply('⏳ 太快了，请稍后')
  }
  lastMsgTime[id] = now

  // ======================
  // ❗管理员不需要验证（你要求关掉）
  // ======================
  const isAdmin = id === ADMIN_ID

  if (!users[id]) {
    users[id] = {
      verified: false,
      question: generateQuestion()
    }
  }

  // ======================
  // 👉 非管理员才验证
  // ======================
  if (!isAdmin && !users[id].verified) {
    if (text === users[id].question.a) {
      users[id].verified = true
      return ctx.reply('✅ 验证成功')
    } else {
      return ctx.reply('❌ 错误：' + users[id].question.q)
    }
  }

  // ======================
  // 👉 转发给管理员（带按钮）
  // ======================
  if (!isAdmin) {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 用户消息

👤 @${username}
🧑 ${name}
🆔 ${id}

💬 ${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💬 回复用户",
                callback_data: `reply_${id}`
              }
            ]
          ]
        }
      }
    )
  }

  ctx.reply('✅ 已收到')
})

// ======================
bot.launch()
console.log('🤖 Bot 已启动')