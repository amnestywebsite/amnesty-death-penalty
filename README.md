Maps of death penalties and executions for Amnesty International.

* 'npm start' to server on http://192.168.0.3:8000/

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

