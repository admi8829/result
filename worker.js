const { Telegraf } = require('telegraf');

// 1. ሚስጥራዊ መረጃዎችን ከ Cloudflare Environment Variables ያነባል
const bot = new Telegraf(process.env.BOT_TOKEN);
const SHEET_URL = process.env.GOOGLE_SHEET_URL;

// /start ሲጫን - የክፍል ምርጫ
bot.command('start', (ctx) => {
  ctx.reply('እንኳን ደህና መጣህ! እባክህ ክፍልህን ምረጥ፡', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Grade 9', callback_data: 'grade_9' }],
        [{ text: 'Grade 10', callback_data: 'grade_10' }]
      ]
    }
  });
});

// የክፍል ምርጫ ሲደረግ - የትምህርት ምርጫ
bot.action(/grade_(\d+)/, (ctx) => {
  const grade = ctx.match[1];
  ctx.answerCbQuery();
  ctx.reply(`ለ Grade ${grade} የትምህርት አይነት ምረጥ፡`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Biology', callback_data: `subject_Biology_${grade}` }],
        [{ text: 'Physics', callback_data: `subject_Physics_${grade}` }]
      ]
    }
  });
});

// ትምህርት ሲመረጥ - ጥያቄ ከ Sheet አምጥቶ መላክ
bot.action(/subject_(.+)_(.+)/, async (ctx) => {
  const subject = ctx.match[1];
  const grade = ctx.match[2];
  ctx.answerCbQuery();

  try {
    const response = await fetch(SHEET_URL);
    const questions = await response.json();

    // ዳታውን ፊልተር አድርግ (በክፍል እና በትምህርት)
    const filtered = questions.filter(q => 
      q.grade.toString().includes(grade) && 
      q.subject.toLowerCase() === subject.toLowerCase()
    );

    if (filtered.length === 0) {
      return ctx.reply(`ይቅርታ፣ ለ Grade ${grade} ${subject} እስካሁን ጥያቄ አልተጫነም።`);
    }

    // አንድ በአጋጣሚ (Random) ጥያቄ ምረጥ
    const q = filtered[Math.floor(Math.random() * filtered.length)];
    const options = [q.option_a, q.option_b, q.option_c, q.option_d];
    const correctId = q.answer.toUpperCase().charCodeAt(0) - 65; // A=0, B=1...

    await ctx.replyWithQuiz(q.question, options, {
      correct_option_id: correctId,
      explanation: q.explanation
    });

  } catch (error) {
    ctx.reply('ዳታ ከ Sheet ላይ ማምጣት አልተቻለም። እባክህ ቆይተህ ሞክር።');
  }
});

// Cloudflare Worker Handler
export default {
  async fetch(request, env) {
    // Environment variables ማስተካከያ
    process.env.BOT_TOKEN = env.BOT_TOKEN;
    process.env.GOOGLE_SHEET_URL = env.GOOGLE_SHEET_URL;

    if (request.method === 'POST') {
      const payload = await request.json();
      await bot.handleUpdate(payload);
      return new Response('OK');
    }
    return new Response('Bot is running!');
  },
};
