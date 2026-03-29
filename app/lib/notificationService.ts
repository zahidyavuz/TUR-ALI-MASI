/**
 * Akıllı Bildirim & Email Sistemi Altyapısı
 * 
 * Bu modül, ileride Firebase Cloud Messaging (FCM), OneSignal veya AWS SNS gibi 
 * Push Notification ve Email sistemlerine bağlanmak üzere tasarlanmıştır.
 */

export const NotificationService = {
    /**
     * 1. Biletin Hazır Bildirimi
     * Kullanıcı rezervasyonu tamamladığında anında tetiklenir.
     */
    sendBookingConfirmation: async (userId: string, pnr: string, tourName: string) => {
        // const payload = { title: "Biletin Hazır! 🎟️", body: `${tourName} için ${pnr} numaralı biletiniz onaylandı.` };
        // await fetch('https://onesignal.com/api/v1/notifications', { ... });
        // console.log(`[FCM/OneSignal API] Notification sent to User:${userId} -> Biletin Hazır! PNR: ${pnr} - ${tourName}`);
    },

    /**
     * 2. Hatırlatıcı (Yarın Maceraya Hazır Mısın?)
     * Cron job veya Queue mantığıyla tura 24 saat kala çalıştırılacak fonksiyon.
     */
    scheduleTourReminder: async (userId: string, tourDate: Date, tourName: string) => {
        // const reminderTime = new Date(tourDate.getTime() - 24 * 60 * 60 * 1000);
        // await BullMQ.add('sendReminder', { userId, tourName }, { delay: reminderTime.getTime() - Date.now() });
        // console.log(`[BullMQ/Redis] Scheduled 24h reminder for User:${userId} -> Yarın ${tourName} macerasına hazır mısın? 🎒`);
    },

    /**
     * 3. Sepet Terk Uyarıları (Unuttuğun Bir Şey Var!)
     * Kullanıcı sepetine tur ekleyip 1 saat işlem yapmadığında tetiklenir.
     */
    trackAbandonedCart: async (userId: string, cartId: string, tourName: string) => {
        // await BullMQ.add('abandonedCart', { userId, cartId }, { delay: 60 * 60 * 1000 }); // 1 Hour delay
        // console.log(`[Event Tracker] Abandoned cart logged for User:${userId}. Queuing email 1 hour later: 'Sepetinizde ${tourName} turunu unuttunuz!' 🛒`);
    }
};
