Ext.define('gxp.plugins.LayerSource', {
    mixins: {
        observable: 'Ext.util.Observable'
    },
    constructor: function(config) {
        this.initConfig(config);
        this.mixins.observable.constructor.call(this, config);
        this.addEvents('ready', 'failure');
    },
    init: function(target) {
        this.target = target;
        this.createStore();
    },
    getMapProjection: function() {
        var projConfig = this.target.mapPanel.map.projection;
        return this.target.mapPanel.map.getProjectionObject() ||
            (projConfig && new OpenLayers.Projection(projConfig)) ||
            new OpenLayers.Projection("EPSG:4326");
    },
    getProjection: function(layerRecord) {
        // to be overridden by subclasses
        var layer = layerRecord.getLayer();
        var mapProj = this.getMapProjection();
        var proj = layer.projection ?
            layer.projection instanceof OpenLayers.Projection ?
                layer.projection :
                new OpenLayers.Projection(layer.projection) :
            mapProj;
        return proj.equals(mapProj) ? mapProj : null;
    },
    createStore: function() {
        this.fireEvent("ready", this);
    },
    createLayerRecord: function(config) {
    },
    getConfigForRecord: function(record) {
        var layer = record.getLayer();
        return {
            source: record.get("source"),
            name: record.get("name"),
            title: record.get("title"),
            visibility: layer.getVisibility(),
            opacity: layer.opacity || undefined,
            group: record.get("group"),
            fixed: record.get("fixed"),
            selected: record.get("selected")
        };
    },
    getState: function() {
        //  Overwrite in subclasses to return anything other than a copy
        // of the initialConfig property.
        return Ext.apply({}, this.initialConfig);
    }
});
