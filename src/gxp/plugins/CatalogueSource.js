/**
 * @requires plugins/WMSSource.js
 */

Ext.define('gxp.plugins.CatalogueSource', {
    extend: 'gxp.plugins.WMSSource',
    url: null,
    yx: null,
    title: null,
    lazy: true,
    hidden: true,
    proxyOptions: null,
    describeLayer: function(rec, callback, scope) {
        // it makes no sense to keep a describeLayerStore since
        // everything is lazy and layers can come from different WMSs.
        var recordType = Ext.data.Record.create(
            [
                {name: "owsType", type: "string"},
                {name: "owsURL", type: "string"},
                {name: "typeName", type: "string"}
            ]
        );
        var record = Ext.create(recordType, {
            owsType: "WFS",
            owsURL: rec.get('url'),
            typeName: rec.get('name')
        });
        callback.call(scope, record);
    },
    destroy: function() {
        this.store && this.store.destroy();
        this.store = null;
        this.callParent(arguments);
    }
});
