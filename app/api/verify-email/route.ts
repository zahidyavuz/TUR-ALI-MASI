import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Demo amaçlı, gerçek bir e-posta kutusuna ihtiyaç duymadan test edebilmek için 
// 'Ethereal' adında sahte bir mail servisi kullanıyoruz.
// Gerçek projede buraya Google (Gmail) stmp veya Hosting mail sunucusu bilgileri girilir.
const createTestTransport = async () => {
    // Demo amaçlı test hesabı oluşturuyoruz
    const testAccount = await nodemailer.createTestAccount();

    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });
};

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'E-posta adresi gereklidir.' }, { status: 400 });
        }

        // Gerçekte burada DB'ye (veritabanına) kod kaydedilir ve kullanıcıyla eşleştirilir.
        // Şimdilik demo kod:
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli rastgele kod

        const transporter = await createTestTransport();

        // E-posta gönderimi
        const info = await transporter.sendMail({
            from: '"Melih Tours" <noreply@melihtours.com>', // Kimden
            to: email, // Kime (Kayıt olan müşteri)
            subject: "E-Posta Doğrulama Kodunuz - Melih Tours", // Konu
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f8f9fa;">
          <h2 style="color: #008cb3;">TourScanner'a Hoş Geldiniz!</h2>
          <p style="font-size: 16px; color: #555;">Hesabınızı başarıyla oluşturabilmek için aşağıdaki doğrulama kodunu kullanın.</p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #ffffff; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <p style="margin: 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Doğrulama Kodunuz</p>
            <h1 style="margin: 10px 0 0 0; color: #333; font-size: 36px; letter-spacing: 4px;">${verificationCode}</h1>
          </div>

          <p style="font-size: 14px; color: #999;">Bu kodu kimseyle paylaşmayınız. Kod 10 dakika boyunca geçerlidir.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #aaa;">TourScanner AŞ. &copy; 2026 Tüm Hakları Saklıdır.</p>
        </div>
      `,
        });

        // Gönderilen e-postanın önizleme adresini konsola yazdır (Bu sadece 'Ethereal' demo hesabı için özeldir, gerçek SMTP'de olmaz)
        // console.log("Mesaj gönderildi: %s", info.messageId);
        // console.log("ÖNİZLEME LİNKİ (Gönderilen maili görmek için): %s", nodemailer.getTestMessageUrl(info));

        return NextResponse.json({
            success: true,
            message: 'Doğrulama e-postası gönderildi.',
            // Demo olduğu için kodun ve mail linkinin ön yüzden okunabilmesi için gönderiyoruz.
            // EĞER GERÇEK SİSTEM OLSAYDI BUNLARI ASLA GERİ DÖNMEZDİK (GÜVENLİK İÇİN)
            previewUrl: nodemailer.getTestMessageUrl(info),
            demoCode: verificationCode
        });

    } catch (error) {
        console.error('Mail gönderme hatası:', error);
        return NextResponse.json({ error: 'Mail gönderilemedi. Sunucu hatası.' }, { status: 500 });
    }
}
