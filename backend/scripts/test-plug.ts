import { loginDeviceByIp, cloudLogin, loginDevice, type TapoDevice} from "tp-link-tapo-connect";
import { get_plug_by_alias, get_plug_by_id, get_plug_by_ip, get_plug_by_mac } from "../plug/plug.js";
import dotenv from "dotenv";
dotenv.config();
const TAPO_EMAIL= process.env.TAPO_EMAIL;
const TAPO_PASSWORD= process.env.TAPO_PASSWORD
async function main() {
    const plug_id= "a6c78fcf-fcc0-435d-8d3c-c9282038657d";
    // const plug= await get_plug_by_alias("Tapo P110");
    // const plug= await get_plug_by_ip('192.168.29.108');
    // const plug= await get_plug_by_mac("C0:3A:55:A1:69:F4");
    const plug= await get_plug_by_id('a6c78fcf-fcc0-435d-8d3c-c9282038657d');

    const action= process.argv[2];

    if(action=="on"){
        await plug.turnOn();
    }

    else if(action=="off"){
        await plug.turnOff();
    }
    else if(action=="status"){
        const device_info= await plug.getDeviceInfo()
        console.log(device_info)
    }

    else if(action=="energy"){
        const energy_info= await plug.getEnergyUsage()
        console.log(energy_info)    
    }

    else{
        console.log("worng input")
    }

    

    // const plug_from_id= get_plug_by_id(plug_id);
    // console.log((await plug_from_id).getDeviceInfo());





}


main().catch((err)=>{
    console.log("Script execution failed!!!");
    process.exit(1);
});
//sample devices object

//  {
//     deviceType: 'SMART.TAPOPLUG',
//     accountApiUrl: 'http://aps1-account-api-internal.tplinkcloud.com',
//     role: 0,
//     fwVer: '1.4.3 Build 251223 Rel.100616',
//     appServerUrl: 'https://aps1-wap.tplinkcloud.com',
//     deviceRegion: 'ap-southeast-1',
//     deviceId: '8022ED452F7C6845C533CF761DA0F8042594AFCD',
//     deviceName: 'P110',
//     lastBindTime: 1784140850261,
//     deviceHwVer: '1.20',
//     alias: 'Tapo P110',
//     deviceMac: 'C03A55A169F4',
//     oemId: '48D37CC22E2B8C68DEDD1C23DF2AADB2',
//     deviceModel: 'P110(IN)',
//     hwId: 'FFB79ECBABD8D5DF9A8BEE18AE9A8EBB',
//     fwId: '00000000000000000000000000000000',
//     isSameRegion: false,
//     appServerUrlV2: 'https://aps1-wap.tplinkcloud.com',
//     status: 0
//   }


// sample device info
// {
//   device_id: '8022ED452F7C6845C533CF761DA0F8042594AFCD',
//   fw_ver: '1.4.3 Build 251223 Rel.100616',
//   hw_ver: '1.20',
//   type: 'SMART.TAPOPLUG',
//   model: 'P110',
//   mac: 'C0-3A-55-A1-69-F4',
//   hw_id: 'FFB79ECBABD8D5DF9A8BEE18AE9A8EBB',
//   fw_id: '00000000000000000000000000000000',
//   oem_id: '48D37CC22E2B8C68DEDD1C23DF2AADB2',
//   ip: '192.168.29.108',
//   time_diff: 330,
//   ssid: 'WiFi 2.4G',
//   rssi: -62,
//   signal_level: 2,
//   auto_off_status: 'off',
//   auto_off_remain_time: 0,
//   longitude: 861303,
//   latitude: 236435,
//   lang: 'en_US',
//   avatar: 'plug',
//   region: 'Asia/Kolkata',
//   specs: 'IN',
//   nickname: 'Tapo P110',
//   has_set_location_info: true,
//   device_on: false,
//   on_time: 0,
//   default_states: { type: 'last_states' },
//   overheat_status: 'normal',
//   power_protection_status: 'normal',
//   overcurrent_status: 'normal',
//   charging_status: 'normal'
// }