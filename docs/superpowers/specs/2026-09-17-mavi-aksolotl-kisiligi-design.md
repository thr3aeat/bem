# Mavi Aksolotl Kişiliği Tasarımı

## Amaç

Botun, mavi aksolotl maskotuna uygun sıcak ve hafif mizahi bir kimlik kazanması; Discord varlığının kontrollü biçimde dönmesi; YouTube abone akışında rol ve geniş kapsamlı mention bildirimlerinin teknik olarak engellenmesi.

## Kapsam

Kişilik metinleri, moderasyon ve güvenlik dışındaki kullanıcı odaklı akışlarda kullanılacaktır: yardım, ping ve durum, karşılama, Roblox kayıt/doğrulama, bekleme ve boş sonuçlar, moderatör iş sırası/ticket benzeri bilgilendirmeler. Cezalar, güvenlik uyarıları, resmî politika metinleri ve kritik hata mesajları nötr kalacaktır.

## Mimari

`src/modules/axolotlPersonality.js` iki küçük sorumluluk taşır:

- Sabit, sıralı durum havuzu ve `startPresenceRotation(client)` işlevi. İlk durum hemen atanır; sonraki durumlar 12 dakikada bir döner. Aynı istemcide ikinci zamanlayıcı açılmaz.
- `subscriberAllowedMentions()` işlevi. Bu, Discord'a yalnızca kullanıcı mention'larına izin verildiğini; rol, `@everyone` ve `@here` bildirimlerinin kapalı olduğunu bildirir.

Hazır olayı tek presence başlatma noktası olarak kalır: sabit `setActivity` çağrısı yeni rotasyon işleviyle değiştirilir. Abone V2 kutlaması, onay kanalı mesajı ve aboneyle ilgili kullanıcı-facing/log gönderimleri ortak güvenli mention işlevini ekleyerek herhangi bir rol pingini engeller. Rol adı, rol nesnesinden alınsa bile yalnızca düz metin gösterilir.

## Abone Akışı Garantileri

- Görsel kontrolü, aynı görsel engeli, rolün otomatik verilmesi, moderatörün onay/red yetkisi ve reddedildiğinde rolün geri alınması aynen kalır.
- Kullanıcı ID'si bilinen metinlerde `<@USER_ID>` kullanılabilir.
- Abone akışında `<@&ROLE_ID>` kullanılmaz.
- `allowedMentions` kullanıcıları destekler; roller, everyone ve here için bildirim üretmez.
- Kullanıcıya ve moderatöre giden abone mesajları temiz, kısa ve anlaşılır kalır; gerekirse yalnızca hafif bir mavi aksolotl dokunuşu kullanır.

## Mesaj Dili

Yeni veya revize edilmiş genel başarı/bekleme/boş sonuç metinleri, işlevsel bilgiyi ilk sırada verir ve tek cümlelik aksolotl dokunuşuyla biter. Örnek: “Doğrulama tamamlandı. Mavi aksolotl kaydı yüzgeciyle işaretledi.” Bu dil ciddi akışlara uygulanmaz.

## Test Stratejisi

Projede test altyapısı bulunmadığından Node'un yerleşik `node:test` aracıyla testler eklenecektir. Testler şunları doğrular:

- Güvenli abone mention ayarı `users` için açık, role/everyone/here için kapalıdır.
- Güvenli ayar kullanıcı mention metnini değiştirmez; rol mention metni üretilmez.
- Status havuzu sıralı ve boş değildir; rotasyon aynı istemci için ikinci interval oluşturmaz.
- Abone olayının rol ekleme ve red olayının rol kaldırma karar koşulları değiştirilmez; buna yönelik kaynak-temelli regresyon kontrolleri yerine saf yardımcı işlevlerin birim testleri uygulanır.

## Dosya Etkisi

- Yeni: `src/modules/axolotlPersonality.js`
- Değişecek: `src/events/ready.js`, `src/events/messageCreateEko.js`, `src/modules/componentsV2Factory.js`, `src/modules/interactionHandlerExt.js`, seçilen kullanıcı-facing yardımcı/komut dosyaları, `package.json`
- Yeni: `test/axolotlPersonality.test.js`, `test/subscriberMentions.test.js`

## Kısıtlar

- Yeni bağımlılık eklenmez.
- Discord presence, 12 dakikadan daha sık güncellenmez.
- Abone rol iş mantığı yeniden yazılmaz.
- Hiçbir abone kullanıcı-facing veya log mesajında rol ping'i yapılmaz.
