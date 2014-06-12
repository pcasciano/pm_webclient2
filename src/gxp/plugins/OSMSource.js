/**
 * @requires plugins/LayerSource.js
 * @requires GeoExt/data/LayerModel.js
 * @requires GeoExt/data/LayerStore.js
 * @include OpenLayers/Layer/OSM.js
 */

Ext.define('gxp.plugins.OSMSource', {
    extend: 'gxp.plugins.LayerSource',
    alias: 'plugin.gxp_osmsource',
    title: "OpenStreetMap Layers",
    mapnikAttribution: "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    osmarenderAttribution: "Data CC-By-SA by <a href='http://openstreetmap.org/' target='_blank'>OpenStreetMap</a>",
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
            transitionEffect: "resize"
        };

        var layers = [
            new OpenLayers.Layer.OSM(
                "OpenStreetMap",
                [
                    "http://a.tile.openstreetmap.org/${z}/${x}/${y}.png",
                    "http://b.tile.openstreetmap.org/${z}/${x}/${y}.png",
                    "http://c.tile.openstreetmap.org/${z}/${x}/${y}.png"
                ],
                OpenLayers.Util.applyDefaults({
                    attribution: this.mapnikAttribution,
                    type: "mapnik"
                }, options)
            )
        ];

        Ext.define('gxp.data.OSMLayerModel',{
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
            layers: layers,
            model: 'gxp.data.OSMLayerModel'
        });
        this.store.each(function(l) {
            l.set("group", "background");
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
