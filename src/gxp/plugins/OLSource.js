/**
 * @requires plugins/LayerSource.js
 * @include GeoExt/data/LayerModel.js
 */

Ext.define('gxp.plugins.OLSource', {
    extend: 'gxp.plugins.LayerSource',
    requires: ['GeoExt.data.LayerModel'],
    alias: 'plugin.gxp_olsource',
    createLayerRecord: function(config) {

        var record;

        // get class based on type in config
        var Class = window;
        var parts = config.type.split(".");
        for (var i=0, ii=parts.length; i<ii; ++i) {
            Class = Class[parts[i]];
            if (!Class) {
                break;
            }
        }

        // TODO: consider static method on OL classes to construct instance with args
        if (Class && Class.prototype && Class.prototype.initialize) {
            // create a constructor for the given layer type
            var Constructor = function() {
                // this only works for args that can be serialized as JSON
                Class.prototype.initialize.apply(this, config.args);
            };
            Constructor.prototype = Class.prototype;

            // create a new layer given type and args
            var layer = new Constructor();

            // apply properties that may have come from saved config
            if ("visibility" in config) {
                layer.visibility = config.visibility;
            }

            Ext.define('gxp.data.OLLayerModel',{
                extend: 'GeoExt.data.LayerModel',
                fields: [
                    {name: "name", type: "string", mapping: 'metadata.name'},
                    {name: "source", type: "string", mapping: 'metadata.source'},
                    {name: "group", type: "string", mapping: 'metadata.group'},
                    {name: "fixed", type: "boolean", mapping: 'metadata.fixed'},
                    {name: "selected", type: "boolean", mapping: 'metadata.selected'},
                    {name: "type", type: "string", mapping: 'metadata.type'},
                    {name: "args", type: "array", mapping: 'metadata.args'},
                    {name: "properties", type: "string", mapping: 'metadata.properties'}
               ]
            });

            Ext.apply(layer.metadata, {
                name: config.name || layer.name,
                source: config.source,
                group: config.group,
                fixed: ("fixed" in config) ? config.fixed : false,
                selected: ("selected" in config) ? config.selected : false,
                type: config.type,
                args: config.args,
                properties: ("properties" in config) ? config.properties : undefined
            });
            record = gxp.data.OLLayerModel.createFromLayer(layer);
        } else {
            throw new Error("Cannot construct OpenLayers layer from given type: " + config.type);
        }
        return record;
    },
    getConfigForRecord: function(record) {
        // get general config
        var config = this.callParent(arguments);
        // add config specific to this source
        var layer = record.getLayer();
        return Ext.apply(config, {
            type: record.get("type"),
            args: record.get("args")
        });
    }
});
