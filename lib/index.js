'use strict';

let axios = require('axios');

let api = axios.create({
	baseURL: 'https://my.goabode.com/api'
});

let rejectedCalls = [];
let token = '';

function abode(username, password) {
	let methods = {
		auth: () => api.post(`/auth2/login`, { headers: { 'Content-Type': 'multipart/form-data' }, id: username, password, uuid: 'XYZ' }),
		mode: {
			away: () => api.put('/v1/panel/mode/1/away'),
			home: () => api.put('/v1/panel/mode/1/home'),
			standby: () => api.put('/v1/panel/mode/1/standby')
		},
		panel: () => api.get('/v1/panel'),
		devices: () => api.get('/v1/devices'),
		associates: () => api.get('/v1/associates')
	};

	function handleRefresh(originalResponse) {
		return new Promise((resolve, reject) => {

			if (originalResponse.status === 403) {
				rejectedCalls.push({ config: originalResponse.config, resolve, reject });
				return methods.auth()
					.then(r => {
						token = r.data.token;

						rejectedCalls.forEach(call => {
							delete call.config.transformRequest;
							delete call.config.transformResponse;

							call.config.headers['abode-api-key'] = token;
							axios(call.config).then(call.resolve).catch(call.reject);
						});

						rejectedCalls = [];
					})
					.catch(err => {
						rejectedCalls = [];
						return reject(originalResponse);
					});
			}

			return resolve(originalResponse);
		});
	}

	api.interceptors.request.use(config => {
		config.headers = Object.assign({}, config.headers, { 'abode-api-key': token });
		return config;
	});

	api.interceptors.response.use(res => handleRefresh(res), err => handleRefresh(err.response));

	return methods;
}


exports.abode = abode;
