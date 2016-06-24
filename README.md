Maps of death penalties and executions.

* 'npm start' to server on http://192.168.0.3:8000/

## Pym.js
> In Pym.js parlance, the parent page is the page you embed the iframe in. And the child frame is the page that is embedded.

## "Rolling" the topojson
1. Downloaded [Natural Earth shapefiles](http://www.naturalearthdata.com/downloads/)
2. Transform the shapefiles into geojson removing Antarctica: `ogr2ogr -f GeoJSON -where "SU_A3 <> 'ATA'" world.json ne_50m_admin_0_countries/ne_50m_admin_0_countries.shp`
3. Transform the geojson into topojson: `topojson --id-property iso_a3 -p name -o world-topo.json world.json`
4. The object name in the topojson file needs to match the name in our JavaScript file, in this case "countries".
5. The resulting file is around 500kb. We could go smaller by doing the same process using the lower resolution (1:110m) or higher by using the higher resolution (1:10m).
