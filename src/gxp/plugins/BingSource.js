/**
 * @requires plugins/LayerSource.js
 * @requires GeoExt/data/LayerModel.js
 * @requires GeoExt/data/LayerStore.js
 * @include OpenLayers/Layer/Bing.js
 */

Ext.define('gxp.plugins.BingSource', {
    extend: 'gxp.plugins.LayerSource',
    alias: 'plugin.gxp_bingsource',
    title: "Bing Layers",
    roadTitle: "Bing Roads",
    aerialTitle: "Bing Aerial",
    labeledAerialTitle: "Bing Aerial With Labels",
    apiKey: "AqTGBsziZHIJYYxgivLBf0hVdrAk9mWO5cQcb8Yux8sW5M8c8opEC2lZqKR1ZZXf",
    createStore: function() {

        var layers = [
            new OpenLayers.Layer.Bing({
                key: this.apiKey,
                name: this.roadTitle,
                type: "Road",
                buffer: 1,
                transitionEffect: "resize"
            }),
            new OpenLayers.Layer.Bing({
                key: this.apiKey,
                name: this.aerialTitle,
                type: "Aerial",
                buffer: 1,
                transitionEffect: "resize"
            }),
            new OpenLayers.Layer.Bing({
                key: this.apiKey,
                name: this.labeledAerialTitle,
                type: "AerialWithLabels",
                buffer: 1,
                transitionEffect: "resize"
            })
        ];

        Ext.define('gxp.data.BingLayerModel',{
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
            model: 'gxp.data.BingLayerModel',
            layers: layers
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
