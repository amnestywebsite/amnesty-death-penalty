Maps of death penalties and executions for Amnesty International.

* 'npm start' to server on http://192.168.0.3:8000/
* 'npm run build:js' to delete vendor.min.js and concat and minify the scripts in the vendor folder

## Data structures
All the data is in a [single file](/data/data.json). Working on separate bits and pasting them in the correct place is risky, but it avoids working with nested structures and keeps to CSV to JSON (and back) straightforward.

### Year data
The year data sits at the top of each year. This controls the year totals and the bar chart.

| |  |
|----------|----------|
| year | 2015 |
| total-executions | 1,998+ |
| total-death-sentences | 1,634+ |
| ABOLITIONIST | 102 |
| ABOLITIONIST FOR ORDINARY CRIMES | 6 |
| ABOLITIONIST IN PRACTICE | 52 |
| RETENTIONIST | 28 |
| countries | [_here is a new array with the country data for this year_] |

### Country data
Each country is an object with the countries array for that year. All countries that need to be active (i.e. press for detailbox) need to be in this array. Only the id (ISO3) is necessary. The country name which is displayed comes from the dictionary file, but it's included in this data to make it easier to identify the country (rather than from only the ISO3 code). "Since" is the year an abolitionist country abolished the death penalty. "Status" is must match one of the four statuses outlined above.

| |  |
|----------|----------|
| id              | IRQ          |
| name            | Iraq         |
| since           |              |
| executions      | 26+          |
| death-penalties | 89+          |
| status          | RETENTIONIST |

### Languages
The languages come from a [language file](/lang/dictionary.json) which includes the translations for all the terms in the application. This approach keeps the data clean and avoids duplication.

To set the language add the language code in a variable in the embed url. Supported languages are ['ar', 'en', 'es', 'fr']. If it is not recognised, it will default to English.

To set the application to Arabic, for example, add `?lang=ar` to the end of the url.

## Pym.js
Pym.js is a way to embed an iframe whose aspect ratio changes at different screen widths.

> In Pym.js parlance, the parent page is the page you embed the iframe in. And the child frame is the page that is embedded.

An example of pym usage is in [iframe-pym.html](/iframe-pym.html)

## Updates
We're leveraging Github's functionality as much as possible. The live version sits in the gh-pages branch. To keep the data clean and not re-introduce errors it's important to pull before pushing (for yearly updates)

## Editing workflow - small edits
Small edits can be done

## Editing workflow - yearly updates
http://www.csvjson.com/csv2json


## "Rolling" the topojson
1. Downloaded [Natural Earth shapefiles](http://www.naturalearthdata.com/downloads/)
2. Transform the shapefiles into geojson removing Antarctica: `ogr2ogr -f GeoJSON -where "SU_A3 <> 'ATA'" world.json ne_50m_admin_0_countries/ne_50m_admin_0_countries.shp`
3. Transform the geojson into topojson: `topojson --id-property iso_a3 -p name -o world-topo.json world.json`
4. The object name in the topojson file needs to match the name in our JavaScript file, in this case "countries".
5. The resulting file is around 500kb. We could go smaller by doing the same process using the lower resolution (1:110m) or higher by using the higher resolution (1:10m).

