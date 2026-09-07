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
   ortsdelen om det behövs.
3. Använd `find_nearby_lulea_bus_stops` endast när koordinater redan finns i frågan
   eller har lämnats av användaren.
4. Använd `plan_lulea_bus_journey` när start och mål har kunnat uttryckas som exakta
   hållplats-ID:n eller koordinater.
5. Använd `get_lulea_bus_departures` för frågor om avgångar från en bestämd hållplats.

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
