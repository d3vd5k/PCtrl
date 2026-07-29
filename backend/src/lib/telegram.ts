import TelegramBot, { type InlineKeyboardButton } from "node-telegram-bot-api";
import { shutdown_pc } from "./pc.js";

const SHUTDOWN_TIMER: Number = Number(process.env.SHUTDOWN_TIMER_MS) || 120000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const chat_id = process.env.TELEGRAM_CHAT_ID;

type ESP_STATUS = "POWERCUT" | "BROWNOUT" | "NORMAL";

let bot: TelegramBot | null = null;
if (token) { bot = new TelegramBot(token, { polling: true }); }

if (bot) {
    bot.on('callback_query', async (callbackQuery) => {
        const action = callbackQuery.data;
        const msg = callbackQuery.message;

        if (!msg || !action) return;
        if (msg.chat.id.toString() !== chat_id) return;


        bot?.answerCallbackQuery(callbackQuery.id);

        console.log(`[telegram] Action triggered: ${action}`);

        if (action === 'SHUTDOWN') {
            bot?.sendMessage(msg.chat.id, "🔌 Initiating safe PC shutdown sequence...");
            try {
                await shutdown_pc();
            } catch (err) {
                console.error("[telegram] Shutdown PC failed:", err);
                bot?.sendMessage(msg.chat.id, `⚠️ Shutdown failed: ${err instanceof Error ? err.message : "unknown error"}`);
            }
        }
        else if (action === 'IGNORE') {
            bot?.sendMessage(msg.chat.id, "🔇 Power cut ignored.");
        }

    });
}


export const send_message = async (event: ESP_STATUS, voltage: number) => {
    if (!bot || !chat_id) return;

    let icon = "✅";
    let message = `Grid restored to NORMAL.\nCurrent Voltage: ${voltage}V`;
    let inlineKeyboard: InlineKeyboardButton[][] = [];

    if (event === "POWERCUT") {
        icon = "🚨";
        message = `POWERCUT DETECTED!\nVoltage dropped to 0V.`;
        inlineKeyboard = [
            [
                { text: "🖥️ Shutdown PC", callback_data: "SHUTDOWN" },
                { text: "🔇 Ignore", callback_data: "IGNORE" }
            ],
        ];
    } else if (event === "BROWNOUT") {
        icon = "⚠️";
        message = `BROWNOUT DETECTED!\nVoltage dropped to ${voltage}V.`;
    }

    try {
        await bot.sendMessage(chat_id, `${icon} **Grid Alert** ${icon}\n\n${message}`, {
            ...(inlineKeyboard.length > 0 && {
                reply_markup: { inline_keyboard: inlineKeyboard }
            })
        });
    } catch (error) {
        console.error("[telegram] Failed to send message:", error);
    }
};

export const send_failure_alert = async (context: string, error: unknown) => {
    if (!bot || !chat_id) return;
    const detail = error instanceof Error ? error.message : String(error);
    await bot.sendMessage(chat_id, `🆘 ${context} failed: ${detail}\n\nManual intervention may be needed.`);
};