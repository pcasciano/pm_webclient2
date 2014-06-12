/**
 * @requires plugins/LayerSource.js
 * @requires GeoExt/data/LayerModel.js
 * @requires GeoExt/data/LayerStore.js
 * @include OpenLayers/Layer/TMS.js
 */

Ext.define('gxp.plugins.MapBoxSource', {
    extend: 'gxp.plugins.LayerSource',
    alias: 'plugin.gxp_mapboxsource',
    title: "MapBox Layers",
    blueMarbleTopoBathyJanTitle: "Blue Marble Topography & Bathymetry (January)",
    blueMarbleTopoBathyJulTitle: "Blue Marble Topography & Bathymetry (July)",
    blueMarbleTopoJanTitle: "Blue Marble Topography (January)",
    blueMarbleTopoJulTitle: "Blue Marble Topography (July)",
    controlRoomTitle: "Control Room",
    geographyClassTitle: "Geography Class",
    naturalEarthHypsoTitle: "Natural Earth Hypsometric",
    naturalEarthHypsoBathyTitle: "Natural Earth Hypsometric & Bathymetry",
    naturalEarth1Title: "Natural Earth I",
    naturalEarth2Title: "Natural Earth II",
    worldDarkTitle: "World Dark",
    worldLightTitle: "World Light",
    worldGlassTitle: "World Glass",
    worldPrintTitle: "World Print",
    createStore: function() {

        var options = {
            projection: "EPSG:900913",
            numZoomLevels: 19,
            serverResolutions: [
                156543.03390625, 78271.516953125, 39135.7584765625,
                19567.87923828125, 9783.939619140625, 4891.9698095703125,
                2445.9849047851562, 1222.9924523925781, 611.4962261962891,
                305.74811309814453, 152.87405654907226, 76.43702827453613,
                38.218514137268066, 19.109257068634033, 9.554628534317017,
                4.777314267158508, 2.388657133579254, 1.194328566789627,
                0.5971642833948135
            ],
            buffer: 1
        };

        var configs = [
            {name: "blue-marble-topo-bathy-jan", numZoomLevels: 9},
            {name: "blue-marble-topo-bathy-jul", numZoomLevels: 9},
            {name: "blue-marble-topo-jan", numZoomLevels: 9},
            {name: "blue-marble-topo-jul", numZoomLevels: 9},
            {name: "control-room", numZoomLevels: 9},
            {name: "geography-class", numZoomLevels: 9},
            {name: "natural-earth-hypso", numZoomLevels: 7},
            {name: "natural-earth-hypso-bathy", numZoomLevels: 7},
            {name: "natural-earth-1", numZoomLevels: 7},
            {name: "natural-earth-2", numZoomLevels: 7},
            {name: "world-dark", numZoomLevels: 12},
            {name: "world-light", numZoomLevels: 12},
            {name: "world-glass", numZoomLevels: 11},
            {name: "world-print", numZoomLevels: 10}
        ];

        var len = configs.length;
        var layers = new Array(len);
        var config;
        for (var i=0; i<len; ++i) {
            config = configs[i];
            layers[i] = new OpenLayers.Layer.TMS(
                this[OpenLayers.String.camelize(config.name) + "Title"],
                [
                    "http://a.tiles.mapbox.com/mapbox/",
                    "http://b.tiles.mapbox.com/mapbox/",
                    "http://c.tiles.mapbox.com/mapbox/",
                    "http://d.tiles.mapbox.com/mapbox/"
                ],
                OpenLayers.Util.applyDefaults({
                    attribution: /^world/.test(name) ?
                        "<a href='http://mapbox.com'>MapBox</a> | Some Data &copy; OSM CC-BY-SA | <a href='http://mapbox.com/tos'>Terms of Service</a>" :
                        "<a href='http://mapbox.com'>MapBox</a> | <a href='http://mapbox.com/tos'>Terms of Service</a>",
                    type: "png",
                    tileOrigin: new OpenLayers.LonLat(-128 * 156543.03390625, -128 * 156543.03390625),
                    layername: config.name,
                    "abstract": '<div class="thumb-mapbox thumb-mapbox-'+config.name+'"></div>',
                    numZoomLevels: config.numZoomLevels
                }, options)
            );
        }

        Ext.define('gxp.data.MapBoxLayerModel',{
            extend: 'GeoExt.data.LayerModel',
            fields: [
                {name: "source", type: "string"},
                {name: "name", type: "string", mapping: "layername"},
                {name: "abstract", type: "string"},
                {name: "group", type: "string"},
                {name: "fixed", type: "boolean"},
                {name: "selected", type: "boolean"}
            ]
        });

        this.store = Ext.create('GeoExt.data.LayerStore', {
            layers: layers,
            model: 'gxp.data.MapBoxLayerModel'
        });
        this.fireEvent("ready", this);

    },
    createLayerRecord: function(config) {
        var record;
        var index = this.store.findExact("name", config.name);
        if (index > -1) {

            record = this.store.getAt(index).copy();
            var layer = record.getLayer().clone();

            // set layer title from config
            if (config.title) {
                /**
                 * Because the layer title data is duplicated, we have
                 * to set it in both places.  After records have been
                 * added to the store, the store handles this
                 * synchronization.
                 */
                layer.setName(config.title);
                record.set("title", config.title);
            }

            // set visibility from config
            if ("visibility" in config) {
                layer.visibility = config.visibility;
            }

            record.set("selected", config.selected || false);
            record.set("source", config.source);
            record.set("name", config.name);
            if ("group" in config) {
                record.set("group", config.group);
            }

            record.data.layer = layer;
            record.commit();
        }
        return record;
    }
});

