/**
 * @require plugins/LayerSource.js
 * @requires GeoExt/data/LayerModel.js
 * @include OpenLayers/Layer/OSM.js
 */

Ext.define('gxp.plugins.MapQuestSource', {
    extend: 'gxp.plugins.LayerSource',
    alias: 'plugin.gxp_mapquestsource',
    title: "MapQuest Layers",
    osmAttribution: "Tiles Courtesy of <a href='http://open.mapquest.co.uk/' target='_blank'>MapQuest</a> <img src='http://developer.mapquest.com/content/osm/mq_logo.png' border='0'>",
    osmTitle: "MapQuest OpenStreetMap",
    naipAttribution: "Tiles Courtesy of <a href='http://open.mapquest.co.uk/' target='_blank'>MapQuest</a> <img src='http://developer.mapquest.com/content/osm/mq_logo.png' border='0'>",
    naipTitle: "MapQuest Imagery",
    createStore: function() {
        
        var options = {
            projection: "EPSG:900913",
            maxExtent: new OpenLayers.Bounds(
                -128 * 156543.0339, -128 * 156543.0339,
                128 * 156543.0339, 128 * 156543.0339
            ),
            maxResolution: 156543.03390625,
            numZoomLevels: 19,
            units: "m",
            buffer: 1,
            transitionEffect: "resize",
            tileOptions: {crossOriginKeyword: null}
        };
        
        var layers = [
            new OpenLayers.Layer.OSM(
                this.osmTitle,
                [
                    "http://otile1.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png",
                    "http://otile2.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png",
                    "http://otile3.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png",
                    "http://otile4.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png"
                ],
                OpenLayers.Util.applyDefaults({                
                    attribution: this.osmAttribution,
                    type: "osm"
                }, options)
            ),
            new OpenLayers.Layer.OSM(
                this.naipTitle,
                [
                    "http://otile1.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png",
                    "http://otile2.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png",
                    "http://otile3.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png",
                    "http://otile4.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png"
                ],
                OpenLayers.Util.applyDefaults({
                    attribution: this.naipAttribution,
                    type: "naip"
                }, options)
            )
        ];

        Ext.define('gxp.data.MapQuestLayerModel',{
            extend: 'GeoExt.data.LayerModel',
            fields: [
                {name: "source", type: "string"},
                {name: "name", type: "string", mapping: "type"},
                {name: "abstract", type: "string", mapping: "attribution"},
                {name: "group", type: "string", defaultValue: "background"},
                {name: "fixed", type: "boolean", defaultValue: true},
                {name: "selected", type: "boolean"}
            ]
        });

        this.store = Ext.create('GeoExt.data.LayerStore', {
            model: 'gxp.data.MapQuestLayerModel',
            layers: layers
        });
        this.store.each(function(l) {
            l.set("group", "background");
        });
        this.fireEvent("ready", this);

    },
    
    /** api: method[createLayerRecord]
     *  :arg config:  ``Object``  The application config for this layer.
     *  :returns: ``GeoExt.data.LayerRecord``
     *
     *  Create a layer record given the config.
     */
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
