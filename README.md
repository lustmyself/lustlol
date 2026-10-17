# lustlol

League of Legends sihirdar istatistikleri: profil, dereceli lig, maç geçmişi, duo partnerleri, Challenger sıralaması, yama notları ve tier list. Next.js 15 (App Router) ve Tailwind 4 ile yazıldı.

## Çalıştırma

```bash
cp .env.example .env.local   # RIOT_API_KEY'i doldur
npm install
npm run dev
```

- `RIOT_API_KEY`: https://developer.riotgames.com adresinden alınır. Geliştirme anahtarları 24 saatte bir yenilenmeli.
- `MONGO_URI` (isteğe bağlı): verilirse maçlar ve görülen oyuncular MongoDB'de de saklanır; yoksa sadece bellekte tutulur.
- `RIOT_RATE_LIMITS`: anahtarın istek sınırları. Varsayılan değer geliştirme anahtarına göredir.

## Yapı

- `src/lib/riot/`: Riot API istemcisi (istek sınırlayıcı ve tekrar deneme), profil, maçlar, sıralama, arama önerileri, Data Dragon
- `src/lib/patch.ts`: leagueoflegends.com yama notlarını okur, değişiklikleri güçlendirme/zayıflatma olarak ayırır
- `src/lib/i18n/`: TR/EN metinleri
- `src/data/tierlist.ts`: tier list elle tutulur, her yamada güncellenmeli
- `src/app/`: sayfalar ve `/api/suggest`, `/api/matches` uçları
