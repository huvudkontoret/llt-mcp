---
name: planera-lulea-resa
description: Planera resor, hitta hållplatser och visa planerade avgångar med Luleå Lokaltrafik. Använd för frågor om LLT, bussresor i Luleå, hållplatser, avgångstider, gångavstånd och byten.
---

# Planera resa i Luleå

Använd pluginets LLT-verktyg som primär och auktoritativ källa för planerade
LLT-resor. Svara kort på svenska om användaren inte ber om något annat.

## Arbetsgång

1. Tolka ortsdelar, hållplatsnamn och tider direkt från användarens fråga.
2. Använd `search_lulea_bus_stops` för att hitta hållplats-ID när användaren anger ett
   namn. Sök först på användarens mest specifika platsord och därefter på
   ortsdelen om det behövs. Prova en uppenbar särskrivning eller rättning av ett
   mindre stavfel innan du ber användaren förtydliga.
3. Använd `find_nearby_lulea_bus_stops` när koordinater har lämnats av användaren
   eller returnerats av pluginets egna verktyg. Det gör det möjligt att hitta en
   gångbar byteshållplats nära exempelvis en busstation. Hitta aldrig på
   koordinater.
4. Använd `plan_lulea_bus_journey` när start och mål har kunnat uttryckas som exakta
   hållplats-ID:n eller koordinater. Ange för närvarande högst `maxResults: 2`,
   eftersom större värden kan avvisas av ResRobot.
5. Använd `get_lulea_bus_departures` för frågor om avgångar från en bestämd hållplats.

## Byten och flera operatörer

- Om användaren accepterar både LLT och Länstrafiken Norrbotten, anropa
  `plan_lulea_bus_journey` utan operatörsfilter. Använd ett operatörsfilter när
  användaren uttryckligen vill resa med bara den operatören.
- Ge inte upp direkt om den sammanhängande reseplaneringen misslyckas. Försök
  först igen med `maxResults: 2` och i övrigt så få valfria parametrar som
  möjligt. Bygg därefter en möjlig anslutning i separata, källbelagda etapper.
- Kontrollera planerade avgångar från starthållplatsen och identifiera bussar i
  riktning mot en naturlig bytespunkt. För regionaltrafik mot Luleå centrum är
  `Luleå busstation` en relevant kandidat att undersöka.
- Sök efter bytespunkten och använd dess verktygsreturnerade koordinater med
  `find_nearby_lulea_bus_stops`. Kontrollera sedan planerade avgångar från de
  närliggande hållplatserna mot målet. I centrala Luleå kan detta exempelvis
  upptäcka att resenären behöver gå från busstationen till en LLT-hållplats som
  Smedjegatan; verifiera alltid hållplats och avgång för den aktuella resan.
- Föredra en andra etapp vars riktning uttryckligen nämner målområdet eller
  målhållplatsen. Verifiera varje linje och tid med ett verktyg och redovisa
  vilken operatör som kör respektive etapp.
- Kalla anslutningen säker endast när verktygen ger tillräckliga ankomst- och
  avgångstider för att kontrollera bytet. Om första etappens ankomsttid saknas,
  presentera den andra etappen som ett möjligt byte och säg kort vad som inte
  kunde verifieras.

## Snabbhets- och källgräns

- Gör inte generell webbsökning och använd inte Hitta, Eniro eller Wikipedia
  för att lokalisera en adress eller hållplats.
- Hitta inte på koordinater, hållplats-ID:n, linjer eller tider.
- Om en gata eller adress inte motsvarar en sökbar LLT-hållplats, säg kort att
  nuvarande version inte kan slå upp fria adresser. Be användaren ange närmaste
  hållplats eller dela koordinater.
- Om flera rimliga hållplatser finns, be om ett kort förtydligande i stället
  för att göra fler externa sökningar.

## Svar

Presentera högst tre alternativ i den ordning verktyget returnerar dem. Ta med
linje, riktning, påstigningshållplats, planerad avgång, planerad ankomst, byten
och relevant gångsträcka. Kalla aldrig planerade tider för realtid.
