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
Each country is an object with the countries array for that year. All countries that need to be active (i.e. press for detailbox) need to be in this array.

* The id (ISO3) is necessary to reference to correct geo data from world-topo.json. * The country name is references the country name translation in the dictionary file (lang/dictionary.json)
* The country name in data.json is in CAPS to indicate that it is not actually the country name but a reference to the key for translation. It must match the translation key in dictionary.json. If you want to change a country name in any language you need to do it in the dictionary file (lang/dictionary.json).
* Don’t ever change anything in CAPS - that indicates it’s a reference rather than the actual value. If in doubt, please double check.
* Putting a "O" in either executions or death-penalties will show the box with O. If you don't want it show - for abolitionist countries - leave it empty, e.g ""
* "Since" is the year an abolitionist country abolished the death penalty. "Status" is must match one of the four statuses outlined above.

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

To set the language add the language code in a variable in the embed url. Supported languages are ['ar', 'en', 'es', 'fr', 'zh_Hans','zh_Hant', 'zh_TW']. If it is not recognised, it will default to English.

To set the application to Arabic, for example, add `?lang=ar` to the end of the url.

Dictionary.getTranslation() looks for a translation in lang/dictionary.json and if it doesn’t find a translation for the provided key and language, it just returns the key instead of the translation. This allows us to translate 1,000s in the DP and execution figures.

To deal with the need for a Chinese symbol after "since" we have added a new dictionary entry with a key like "SINCE_SUFFIX", with the Chinese symbol as the Chinese translation, and a blank string for all other languages.

## iframe-resizer
iframe-resizer is a way to embed an iframe whose aspect ratio changes at different screen widths.

See https://github.com/davidjbradshaw/iframe-resizer for documentation.

An example of iframe-resizer usage is in [iframe-resizer.html](/iframe-resizer.html)

## Updates
We're leveraging Github's functionality as much as possible. The live version sits in the gh-pages branch. To keep the data clean and not re-introduce errors it's important to pull before pushing (for yearly updates)

## NOTE: the gh-pages branch is the live version. Any edits in this branch will be published immediately.

## Editing workflow - small edits
Small edits can be done in Github using a Github account. If it's a tiny change and you are confident about making it, you can work directly in gh-pages. If not, you can create a new branch when you save it and then merge it into gh-pages once you are happy using a pull request.

1. Log in to Github
2. Make sure you are working in the correct branch. gh-pages is the live branch. If you're not sure, you can make a new branch from the gh-pages one and then merge your changes into gh-pages once you have previewed them.
3. Go to the [data file](/data/data.json)
4. Click on the pencil in the top right
5. Make the edit
6. Save the edit - add a commit message and save in the current branch (see point 2 above for details about branches).
7. You can preview the changes made in the your branch using this url and adding the correct branch name where is says BRANCH-NAME: https://htmlpreview.github.io/?https://github.com/wearethoughtfox/amnesty-dp-2016/blob/BRANCH-NAME/index.html

## Editing workflow - yearly updates
Two files are necessary for yearly updates. One for the year data and one for the country data. Pass these CSVs to a developer who can integrate them and update the timeline for an extra year.

Each year is in a separate sheet. Some things to watch out for:

1. Make sure the extra columns are empty.
2. Make sure the year is text (Select, right click, Format cells, text)
3. Make sure when save as CSV to "edit filter settings" and "quote all text cells"
4. http://www.convertcsv.com/csv-to-json.htm
5. Double check everything once it is imported
6. Export the data from json to csv if someone wants to work in a spreadsheet. This will avoid re-introducing errors that have been fixed.

## "Rolling" the topojson
1. Downloaded [Natural Earth shapefiles](http://www.naturalearthdata.com/downloads/). Look for "Cultural", 1:50m Admin 0 - Countries. 
2. Transform the shapefiles into geojson removing Antarctica: `ogr2ogr -f GeoJSON -where "SU_A3 <> 'ATA'" world.json ne_50m_admin_0_countries/ne_50m_admin_0_countries.shp`
3. Transform the geojson into topojson: `topojson --id-property iso_a3 -p name -o world-topo.json world.json`
4. The object name in the topojson file needs to match the name in our JavaScript file, in this case "countries".
5. Note that for the border changes I have used https://mapshaper.org/. This allows you to make all of the same changes in the browser and doesn't require any software to be installed. 
6. The resulting file using mapshaper is a bit larger, 700kb. We could go smaller by doing the same process using the lower resolution (1:110m) or higher by using the higher resolution (1:10m).

## Useful mapshaper tips and commands
- Make sure that you open the whole zip file from natural earth. This will ensure that you have all the metadata, rather than just the features. 
- Mapshaper has a GUI that allows you to view the map and complete some edit functions without using the console. However, you will definitely still need to use the console and use some commands.
- Make sure when you export the file from mapshaper you save it as topojson, and call it world-topo-1-3.json
- "objects" in the TopoJSON must be called "countries" (I edited this in the outputed file, which can then be reimported. but there may also be a way to do this in mapshaper)

mapshaper commands:
1. dissolve - if you need to combine more than one feature (e.g. Denmark and Greenland) you will need this command to dissolve the existing borders.
2. merge-layers - this command is required to merge any layers that you've been editing back into the main layer for the map.
3. explode - useful if there is a feature (i.e. country or territory) that has been merged into a larger feature in the source shape files.
4. filter-fields - there are lots of additional fields in the natural earth shape files that you don't need. You just want to keep the iso_a3 ids.
5. rename-fields - use this to rename the iso_a3 field that you've kept to id. Note that when inspecting elements in mapshaper this shows as "FID" 

Useful links for more info on mapshaper commands
- https://github.com/mbloch/mapshaper/blob/master/REFERENCE.md
- https://handsondataviz.org/mapshaper.html

## Fixing disputed territories 
### Download shape files for disputed territories 
See https://www.naturalearthdata.com/downloads/50m-cultural-vectors/ - Admin 0 – Breakaway, disputed areas

### Get the two shapefiles into a separate geojson file
- If using ogr2ogr rather than mapshaper you can use the following command: 
ogr2ogr -f GeoJSON -where "name IN ('Golan Heights', 'Western Sahara')" disputed.json ne_50m_admin_0_breakaway_disputed_areas/ne_50m_admin_0_breakaway_disputed_areas.shp
- In mapshaper you can use select and split to move these features to their own layer, so that they can then be merged back into the main map

### Get the two shapefiles into a separate geojson file
Merge Western Sahara and Morocco together into single polygon (get them on a separate layer in mapshaper and use the dissolve command) 
iso_a3 - ESH  
iso_a3 - MAR  
Include Western Sahara from disputed territory dataset  
name="Western Sahara"  
Dotted line for border (NB the dotted line drawn by is custom code in the JavaScript, it is not something thart you can do in mapshaper or ogr2ogr)

Merge Somaliland and Somalia together into single polygon (get them on a separate layer in mapshaper and use the dissolve command)
iso_a3 - -99 at the moment  - SOL  
iso_a3 - SOM  
Dotted line for Somaliland has been removed

Include Golan Heights from disputed territory (merge layer into the main map. the dotted line will show automatically from the js once the feature is part of the map) 
name="Golan Heights"  
Dotted line for border (NB, this is also in the JavaScript)

Kosovo and Serbia are no longer merged, so this step has been removed 
