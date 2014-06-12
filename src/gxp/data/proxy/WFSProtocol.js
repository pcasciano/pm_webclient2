/**
 * @requires GeoExt/data/proxy/Protocol.js
 */

Ext.define('gxp.data.proxy.WFSProtocol', {
    extend: 'GeoExt.data.proxy.Protocol',
    alias: 'proxy.gxp_wfsprotocol',
    setFilter: function(filter) {
        this.protocol.filter = filter;
        // TODO: The protocol could use a setFilter method.
        this.protocol.options.filter = filter;
    },
    constructor: function(config) {

        Ext.applyIf(config, {

            /** api: config[version]
             *  ``String``
             *  WFS version.  Default is "1.1.0".
             */
            version: "1.1.0"

            /** api: config[maxFeatures]
             *  ``Number``
             *  Optional limit for number of features requested in a read.  No
             *  limit set by default.
             */

            /** api: config[multi]
             *  ``Boolean`` If set to true, geometries will be casted to Multi
             *  geometries before writing. No casting will be done for reading.
             */

        });

        // create the protocol if none provided
        if(!(this.protocol && this.protocol instanceof OpenLayers.Protocol)) {
            config.protocol = new OpenLayers.Protocol.WFS(Ext.apply({
                version: config.version,
                srsName: config.srsName,
                url: config.url,
                featureType: config.featureType,
                featureNS :  config.featureNS,
                geometryName: config.geometryName,
                schema: config.schema,
                filter: config.filter,
                maxFeatures: config.maxFeatures,
                multi: config.multi
            }, config.protocol));
        }
        this.callParent(arguments);
    },
    doRequest: function(operation, callback, scope) {
        if (operation.action === 'read') {
            this.callParent(arguments);
        } else {
            var records = operation.records;
            // get features from records
            var features = new Array(records.length), feature;
            Ext.each(records, function(r, i) {
                features[i] = r.raw;
                feature = features[i];
                feature.modified = Ext.apply(feature.modified || {}, {
                    attributes: Ext.apply(
                        (feature.modified && feature.modified.attributes) || {},
                        r.modified
                    )
                });
            }, this);
            var options = {
                callback: function(response) {
                    this.onProtocolCommit(response, operation, callback, scope);
                },
                scope: this
            };
            this.protocol.commit(features, options);
        }

    },
    onProtocolCommit: function(response, operation, callback, scope) {
        if(response.success()) {
            operation.setSuccessful();
            var features = response.reqFeatures;
            // deal with inserts, updates, and deletes
            var state, feature;
            var destroys = [];
            var insertIds = response.insertIds || [];
            var i, len, j = 0;
            for(i=0, len=features.length; i<len; ++i) {
                feature = features[i];
                state = feature.state;
                if(state) {
                    if(state == OpenLayers.State.DELETE) {
                        destroys.push(feature);
                    } else if(state == OpenLayers.State.INSERT) {
                        feature.fid = insertIds[j];
                        ++j;
                    } else if (feature.modified) {
                        feature.modified = {};
                    }
                    feature.state = null;
                }
            }

            for(i=0, len=destroys.length; i<len; ++i) {
                feature = destroys[i];
                feature.layer && feature.layer.destroyFeatures([feature]);
            }
            len = features.length;
            var data = new Array(len);
            var f;
            for (i=0; i<len; ++i) {
                f = features[i];
                // TODO - check if setting the state to null here is appropriate,
                // or if feature state handling should rather be done in
                // GeoExt.data.FeatureStore
                data[i] = {id: f.id, feature: f, state: null};
                var fields = operation.records[i].fields;
                for (var a in f.attributes) {
                    if (fields.containsKey(a)) {
                        data[i][a] = f.attributes[a];
                    }
                }
            }
            callback.call(scope, operation);
        } else {
            // TODO: determine from response if exception was "response" or "remote"
            var request = response.priv;
            if (request.status >= 200 && request.status < 300) {
                // service exception with 200
                this.fireEvent("exception", this, "remote", operation.action, operation, response.error, operation.records);
            } else {
                // non 200 status
                this.fireEvent("exception", this, "response", operation.action, operation, request);
            }
            callback.call(scope, operation);
        }
    }
});
