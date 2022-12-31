import create from 'zustand';
import { IEnvironment, TId, EEnvironmentScope } from '@firecamp/types';
import { Rest } from '@firecamp/cloud-apis';

type TTabId = TId;
type TColId = TId;
type TEnvId = TId;

const initialState = {
  tabColMap: {},
  colEnvMap: {},
  isEnvSidebarOpen: false,
  colEnvTdpInstance: null,
  envs: [],
};

type TCreateEnvPayload = {
  name: string;
  variables: { [k: string]: string };
  __meta: { type: string; visibility?: number };
  __ref: { workspaceId: string; collectionId?: string };
};

export interface IEnvironmentStore {
  isEnvSidebarOpen: boolean;
  tabColMap: { [tabId: TTabId]: TColId };
  colEnvMap: { [colId: TColId]: TEnvId };
  isProgressing?: boolean;
  colEnvTdpInstance: any;
  envs: IEnvironment[];

  registerTDP: (colEnvTdpInstance: any) => void;
  unRegisterTDP: () => void;

  initialize: (envs: IEnvironment[]) => void;
  toggleEnvSidebar: () => void;
  toggleProgressBar: (flag?: boolean) => void;

  getCollectionEnvs: (collectionId: TColId) => any[];
  getCollectionActiveEnv: (collectionId: TColId) => TEnvId;

  setCollectionActiveEnv: (collectionId: TColId, envId: TEnvId) => void;
  setEnvVariables: (envId: TEnvId, variables: object) => void;

  fetchEnvironment: (envId: TEnvId) => Promise<any>;
  createEnvironment: (payload: TCreateEnvPayload) => Promise<any>;
  updateEnvironment: (envId: string, body: any) => Promise<any>;
  deleteEnvironment: (envId: TId) => Promise<any>;

  // common
  dispose: () => void;
}

export const useEnvStore = create<IEnvironmentStore>((set, get) => ({
  ...initialState,

  initialize: (envs: IEnvironment[] = []) => {
    let activeTabCollectionEnvs = {};
    let cEnvs = envs
      .filter((e) => ['C', 'P'].includes(e.__meta.type))
      .reduce((p, e) => {
        if (!p[e.__ref.collectionId]) p[e.__ref.collectionId] = [];

        //@ts-ignore
        return {
          ...p,
          [e.__ref.collectionId]: [...p[e.__ref.collectionId], e],
        };
      }, {} as any);
    let _cEnvs = Object.keys(cEnvs).reduce(
      (collEnvs, key) => ({
        ...collEnvs,
        [key]: cEnvs[key].reduce((c, e) => ({ ...c, [e.__ref.id]: e }), {}),
      }),
      {}
    );

    // set active environment for workspace and collection
    for (let key in _cEnvs) {
      activeTabCollectionEnvs[key] = Object.keys(_cEnvs[key])[0] || '';
    }

    // console.log({ activeTabCollectionEnvs });
    // console.log({ _wEnvs, _cEnvs });

    set((s) => ({
      envs: envs,
      activeTabCollectionEnvs,
    }));
  },

  registerTDP: (colEnvTdpInstance) => {
    const { envs } = get();
    colEnvTdpInstance?.init(envs);
    set((s) => ({ colEnvTdpInstance }));
  },

  // unregister TreeDatProvider instance
  unRegisterTDP: () => {
    set((s) => ({ colEnvTdpInstance: null }));
  },

  toggleEnvSidebar: () => {
    set((s) => ({ isEnvSidebarOpen: !s.isEnvSidebarOpen }));
  },

  toggleProgressBar: (flag: boolean) => {
    set((s) => ({ isProgressing: flag }));
  },

  setEnvVariables: (envId, variables: object) => {
    set((s) => {
      const envs = s.envs.map((e) => {
        if (e.__ref.id == envId) {
          return { ...e, variables };
        }
        return e;
      });
      return { envs };
    });
    return;
  },

  setCollectionActiveEnv: (collectionId, envId) => {
    set((s) => ({
      colEnvMap: {
        ...s.colEnvMap,
        [collectionId]: envId,
      },
    }));
  },

  getCollectionActiveEnv: (collectionId) => {
    return get().colEnvMap[collectionId];
  },

  getCollectionEnvs: (collectionId) => {
    return get().envs.filter((e) => e.__ref.collectionId == collectionId);
  },

  // Environment
  fetchEnvironment: async (envId: string) => {
    const state = get();
    state.toggleProgressBar(true);
    const res = await Rest.environment
      .fetch(envId)
      .then((r: any) => {
        const env = r.data;
        //TODO: set this newly fetched env in store later if feel need
        return env;
      })
      .finally(() => {
        state.toggleProgressBar(false);
      });
    return res;
  },

  createEnvironment: async (_collection: TCreateEnvPayload) => {
    const state = get();
    state.toggleProgressBar(true);
    const res = await Rest.environment
      .create(_collection)
      .then((r) => {
        set((s) => {
          if (r.data.__meta.type == EEnvironmentScope.Collection) {
            s.colEnvTdpInstance?.addEnvItem(r.data);
          }
          return { envs: [...s.envs, r.data] };
        });
        return r;
      })
      .finally(() => {
        state.toggleProgressBar(false);
      });
    return res;
  },

  updateEnvironment: async (envId: TId, body: Partial<IEnvironment>) => {
    const state = get();
    state.toggleProgressBar(true);
    const res = await Rest.environment
      .update(envId, body)
      .then((r: any) => {
        const env = r.data;
        set((s) => {
          const envs = s.envs.map((e) => {
            if (e.__ref.id == env.__ref.id) return env;
            return e;
          });
          return { envs };
        });
        return r;
      })
      .finally(() => {
        state.toggleProgressBar(false);
      });
    return res;
  },

  deleteEnvironment: (envId: string) => {
    const state = get();
    state.toggleProgressBar(true);
    return Rest.environment
      .delete(envId)
      .then((r) => {
        set((s) => {
          const env = s.envs.find((e) => e.__ref.id == envId);
          if (env) {
            if (env.__meta.type == EEnvironmentScope.Collection) {
              s.colEnvTdpInstance?.removeEnvItem(envId);
            }
          }
          const envs = s.envs.filter((e) => e.__ref.id != envId);
          return { envs };
        });
        return r;
      })
      .finally(() => {
        get().toggleProgressBar(false);
      });
  },

  // dispose whole store and reset to initial state
  dispose: () => set({ ...initialState }),
}));
