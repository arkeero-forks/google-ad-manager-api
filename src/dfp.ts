import { GamApiVersions, Clients, ServiceActionParameters, ServiceActionReturn } from "@arktypes/google-ad-manager-api";
import { BearerSecurity, Client, createClient } from 'soap';
import { promiseFromCallback } from "./utils.js";


export interface DFPClient extends Client {
    setToken(token: string): void;
}

export class DFP<A extends string, B extends GamApiVersions> {
    declare private readonly networkCode;
    declare private readonly apiVersion;
    declare public readonly getService;

    constructor(networkCode: A, apiVersion: B) {

        this.networkCode = networkCode as A;
        this.apiVersion = apiVersion as B;
        this.getService = async function <C extends keyof Clients[B], D extends keyof Clients[B][C]>(service: C, token?: string): Promise<Clients[B][C]> {    //    const eto = await this.dudeService("latest", service as any,token);

            const serviceUrl = `https://ads.google.com/apis/ads/publisher/${this.apiVersion}/${service.toString()}?wsdl`;
            const client: DFPClient & Clients[B][C] & { hasOwnProperty: (token: string) => boolean } = await promiseFromCallback((cb) => createClient(serviceUrl, cb));

            client.addSoapHeader(this.getSoapHeaders());

            client.setToken = function setToken(token: string) {
                client.setSecurity(new BearerSecurity(token));
            };

            if (token) {
                client.setToken(token);
            }

            const proxy = new Proxy(client, {
                get: function get(target, propertyKey) {
                    const method = propertyKey.toString() as D;
                    //existe el metodo en el cliente
                    if (target.hasOwnProperty(method as string)) {
                        const targetMethode = target[method] as Clients[B][C][D];
                        if (method === "setToken")
                            return targetMethode
                        return async (params: ServiceActionParameters<B, C, D>) => {
                            //@ts-ignore
                            const res = await promiseFromCallback((callback) => targetMethode(params, callback));
                            return res.rval as ServiceActionReturn<B, C, D>
                        }


                    }

                }
            });
            return proxy
        };
    }

    private getSoapHeaders() {
        const { apiVersion, networkCode } = this;

        return {
            RequestHeader: {
                attributes: {
                    'soapenv:actor': "http://schemas.xmlsoap.org/soap/actor/next",
                    'soapenv:mustUnderstand': 0,
                    'xsi:type': "ns1:SoapRequestHeader",
                    'xmlns:ns1': "https://www.google.com/apis/ads/publisher/" + apiVersion,
                    'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance",
                    'xmlns:soapenv': "http://schemas.xmlsoap.org/soap/envelope/"
                },
                'ns1:networkCode': networkCode,
                'ns1:applicationName': 'content-api'
            }
        };
    }

}