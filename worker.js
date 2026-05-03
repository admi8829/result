import { Telegraf } from 'telegraf';

export default {
  async fetch(request, env) {
    // 1. ቦቱን በየሪኩዌስቱ መሃል ማስነሳት (ለንባብ እንዲቀል)
    const bot = new Telegraf(env.BOT_TOKEN);
    const SHEET_URL = env.GOOGLE_SHEET_URL;

    // --- የቦቱ ተግባራት (Bot Logic) ---

    // /start ሲጫን
    bot.command('start', (ctx) => {
      return ctx.reply('እንኳን ደህና መጣህ! እባክህ ክፍልህን ምረጥ፡', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Grade 9', callback_data: 'grade_9' }],
            [{ text: 'Grade 10', callback_data: 'grade_10' }]
          ]
        }
      });
    });

    // የክፍል ምርጫ ሲደረግ
    bot.action(/grade_(\d+)/, (ctx) => {
      const grade = ctx.match[1];
      return ctx.reply(`ለ Grade ${grade} የትምህርት አይነት ምረጥ፡`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Biology', callback_data: `subj_Biology_${grade}` }],
            [{ text: 'Physics', callback_data: `subj_Physics_${grade}` }]
          ]
        }
      });
    });

    // ትምህርት ሲመረጥ ጥያቄ ማምጣት
    bot.action(/subj_(.+)_(.+)/, async (ctx) => {
      const subject = ctx.match[1];
      const grade = ctx.match[2];

      try {
        const response = await fetch(SHEET_URL);
        const questions = await response.json();

        const filtered = questions.filter(q => 
          q.grade.toString().includes(grade) && 
          q.subject.toLowerCase() === subject.toLowerCase()
        );

        if (filtered.length === 0) {
          return ctx.reply(`ይቅርታ፣ ለ Grade ${grade} ${subject} ጥያቄ አልተገኘም።`);
        }

        const q = filtered[Math.floor(Math.random() * filtered.length)];
        const options = [q.option_a, q.option_b, q.option_c, q.option_d];
        const correctId = q.answer.toUpperCase().charCodeAt(0) - 65;

        return ctx.replyWithQuiz(q.question, options, {
          correct_option_id: correctId,
          explanation: q.explanation
        });
      } catch (err) {
        return ctx.reply('ጥያቄዎችን ማምጣት አልተቻለም። እባክህ የ Sheet URL በትክክል መኖሩን አረጋግጥ።');
      }
    });

    // --- የሪኩዌስት አያያዝ (Request Handling) ---

    if (request.method === 'POST') {
      try {
        const payload = await request.json();
        await bot.handleUpdate(payload);
        return new Response('OK', { status: 200 });
      } catch (err) {
        console.error('Error handling update:', err);
        return new Response('Error', { status: 500 });
      }
    }

    return new Response('Bot is alive!', { status: 200 });
  }
};
        
