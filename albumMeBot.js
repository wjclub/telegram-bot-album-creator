const Telegraf = require('telegraf')
const TelegrafI18n = require('telegraf-i18n')
const TelegrafLocalSession = require('telegraf-session-local')
const path = require('path')
 

// Prepare i18n
const i18n = new TelegrafI18n({
  defaultLanguage: 'en',
  allowMissing: true,
  directory: path.resolve(__dirname, 'locales')
})

// Prepare sessions
const LocalSession = new TelegrafLocalSession({
  storage: TelegrafLocalSession.storageMemory
})

// Create bot and load middlewares
const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(i18n.middleware())
bot.use(LocalSession.middleware())
 

//
//  Bot logic
//

bot.start((ctx) => {
  const message = ctx.i18n.t('greeting', {
    username: ctx.from.username
  })
  return ctx.reply(message, {
    reply_markup: {
      keyboard: [
        [{ text: ctx.i18n.t('keyboard_done') }],
        [{ text: ctx.i18n.t('keyboard_clear') }],
      ],
      one_time_keyboard: false
    }
  })
})

bot.help(ctx => {
  ctx.reply(ctx.i18n.t('help'))
})

bot.settings(ctx => {
  ctx.reply(ctx.i18n.t('settings'))
})

bot.command('source', ctx => {
  ctx.reply(ctx.i18n.t('source'))
})

// Add album entries
bot.on('photo', ({ message, session, reply, i18n }) => {

  // Ensure a mediaQueue exists in the user's session
  if (session.mediaQueue === undefined)
    session.mediaQueue = []

  //Add photo to album in session
  const imgFileId = message.photo.pop().file_id
  session.mediaQueue.push({ type: 'photo', media: imgFileId})

})

// Add video entries
bot.on('video', ({ message, session, reply, i18n }) => {

  // Ensure a mediaQueue exists in the user's session
  if (session.mediaQueue === undefined)
    session.mediaQueue = []

  //Add video to album in session
  const vidFileId = message.video.file_id
  session.mediaQueue.push({ type: 'video', media: vidFileId })

})



// Finish album creation
bot.hears(TelegrafI18n.match('keyboard_done'), async ({ i18n, reply, replyWithMediaGroup, session}) => {

  // Return if only one media item is present
  if (!session.mediaQueue || session.mediaQueue.length < 1) {
    reply(i18n.t('not_enough_media_items'))
    return
  }

  // Remove media queue from session
  const queue = session.mediaQueue
  session.mediaQueue = []

  // split media into media groups
  let n = queue.length
  let pages = Math.ceil(n / 10)
  let ItemsPerPage = Math.floor(n / pages)
  let k = (n % pages) /* How many times we need to sneek an extra mediaItem in */

  try {

    for (let i = 0; i < pages; i++) {
      // Move media items from queue to to-be-sent queue
      const mediaToSend = queue.splice(0, ItemsPerPage + ((i < k)? 1 : 0))
      
      // Send media group
      await replyWithMediaGroup(mediaToSend)
    }
    
  } catch (error) {
    reply('Something went wrong while sending the album. Please try again in a minute or contact us. (Contact in this bot\'s profile)').catch(err => {
      console.error('Could not send album AND error message to user.')
    })
  }

})

bot.hears(TelegrafI18n.match('keyboard_clear'), (ctx) => {
  ctx.session.mediaQueue = []
  return ctx.reply(ctx.i18n.t('queue_cleared'))
})


// Start bot
bot.startPolling()