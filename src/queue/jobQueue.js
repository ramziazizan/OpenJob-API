const amqp = require('amqplib');

const sendToQueue = async (queueName, data) => {
    try {
        // Terhubung ke CloudAMQP melalui .env
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        // Pastikan queue tersedia
        await channel.assertQueue(queueName, { durable: true });
        
        // Kirim pesan ke antrean
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
        
        console.log(`[x] Pesan berhasil dikirim ke queue: ${queueName}`);

        // Tutup koneksi setelah mengirim agar tidak memakan memori
        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('RabbitMQ API Error:', error);
    }
};

module.exports = sendToQueue;