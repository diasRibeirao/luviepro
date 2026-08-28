import {dependencyHealth} from './health-state';describe('dependency health',()=>{it('records state and latency',()=>expect(dependencyHealth('up',10,14)).toEqual({state:'up',latencyMs:4}));});
