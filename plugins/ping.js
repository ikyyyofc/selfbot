export default {
  async execute({ m, reply }) {
    const startTime = m.timestamp;
    const speed = Date.now() - startTime * 1000;
    
    await reply(`pong! ${speed} milidetik`);
  }
};