/**
 * @requires data/proxy/WFSProtocol.js
 * @requires GeoExt/data/FeatureStore.js
 * @requires GeoExt/data/reader/Feature.js
 */

Ext.define('gxp.data.WFSFeatureStore', {
    extend: 'GeoExt.data.FeatureStore',
    requires: ['GeoExt.data.reader.Feature', 'gxp.data.proxy.WFSProtocol'],
    setOgcFilter: function(ogcFilter) {
        this.proxy.setFilter(ogcFilter);
    },
    constructor: function(config) {
        if(!(config.proxy && config.proxy instanceof GeoExt.data.proxy.Protocol)) {
            config.proxy = Ext.create('gxp.data.proxy.WFSProtocol', Ext.apply({
                srsName: config.srsName,
                url: config.url,
                featureType: config.featureType,
                featureNS:  config.featureNS,
                reader: {
                    type: 'feature',
                    idProperty: 'id'
                },
                geometryName: config.geometryName,
                schema: config.schema,
                filter: config.ogcFilter,
                maxFeatures: config.maxFeatures,
                multi: config.multi
            }, config.proxy));
        }
        if(!config.writer) {
            // a writer is not used, but is required by store.save
            config.writer = Ext.create('Ext.data.DataWriter', {
                write: Ext.emptyFn
            });
        }
        gxp.data.WFSFeatureStore.superclass.constructor.apply(this, arguments);

        /**
         * TODO: Determine what needs to be done to the feature reader to
         * properly fit the 3.0 DataReader inteface.
         *
         * This method gets called with the data that goes to the reader.realize
         * method.  This method requires that the data has a property with the
         * same name as reader.meta.idProperty.  The WFSProtocolProxy prepares
         * a data object for each feature, with a fid and feature property.  The
         * return from this method will be applied to record.data.  So it makes
         * sense that it looks very much like what reader.readRecords does.
         */
        /*var reader = this.proxy.reader;
        this.proxy.reader.extractValues = (function(data, items, length) {
            var obj = reader.readRecords([data.feature]);
            return obj.records[0].data;
        });*/

        /**
         * TODO: Determine the appropriate meta.idProperty value.
         * If this is set to fid, then we can't use store.getById given a feature
         * until after the feature has been saved.  If this is set to id, then
         * we better never have to create a new feature that represents the
         * same record.
         */
        //this.proxy.reader.meta.idProperty = "id";
        /**
         * TODO: Same as above, but it seems that the getId method is responsible
         * for determining the id in Ext > 3.0. This is crucial after changes
         * are committed (see WFSProtocolProxy::onProtocolCommit), because the
         * callback there does an isData check, which involves an attempt to get
         * the id through this method.
         */
        //this.proxy.reader.getId = function(data) {
        //    return data.id;
        //};



    }

});
