import { FC, useRef, useState } from 'react';
import {
  Button,
  Container,
  Input,
  Modal,
  ProgressBar,
  TabHeader,
} from '@firecamp/ui-kit';
import { Tree, UncontrolledTreeEnvironment } from '@firecamp/ui-kit/src/tree';
import { TreeDataProvider } from './tree/dataProvider';
import treeRenderer from './tree/itemRenderer';
import { IPromptSaveItem } from './types';

const _texts: IPromptSaveItem['texts'] = {
  btnOk: 'Create',
  btnOking: 'Creating...',
  btnCancle: 'Cancle',
};

export const PromptSaveItem: FC<IPromptSaveItem> = ({
  header,
  lable = 'Name',
  placeholder,
  texts,
  value,
  folders,
  onClose,
  validator,
  executor,
  onResolve,
  onError,
}) => {
  const [state, setState] = useState({
    isOpen: true,
    isExecuting: false,
    inputValue: value,
    folderId: '',
    error: '',
  });
  const _close = (e) => {
    setState((s) => ({ ...s, isOpen: false }));
    setTimeout(() => {
      onClose(e);
    }, 500);
  };
  const _onChangeValue = (e) => {
    const { value } = e.target;
    setState((s) => ({ ...s, value, error: '' }));
  };
  const _onClickOk = async (e) => {
    e.preventDefault();
    const value = state.inputValue.trim();
    const result = { value, folderId: state.folderId };
    let _validator: { isValid: boolean; message?: string } = { isValid: true };
    if (typeof validator == 'function') _validator = validator(value);
    // console.log(_validator, '_validator');
    if (_validator.isValid == false) {
      setState((s) => ({ ...s, error: _validator.message }));
      if (typeof onError == 'function') onError(new Error(_validator.message));
    } else {
      if (typeof executor == 'function') {
        setState((s) => ({ ...s, error: '', isExecuting: true }));
        executor(result)
          .then((res) => {
            onResolve(res);
            // finally close the prompt on success
            setState((s) => ({ ...s, isOpen: false, isExecuting: false }));
          })
          .catch((e) => {
            if (typeof onError == 'function') {
              console.error(e);
              onError(e);
            }
            setState((s) => ({
              ...s,
              isExecuting: false,
              error: e?.response?.data?.message || e.message,
            }));
          });
      } else {
        onResolve(result);
        // finally close the prompt on success
        setState((s) => ({ ...s, error: '', isOpen: false }));
      }
    }
  };
  texts = { ..._texts, ...texts };
  return (
    <Modal
      isOpen={state.isOpen}
      onClose={_close}
      height="250px"
      width={'400px'}
    >
      <Modal.Body>
        <ProgressBar active={state.isExecuting} />
        <div className="p-6">
          <label className="text-sm font-semibold leading-3 block text-appForegroundInActive uppercase w-full relative mb-2">
            {header || `THIS IS A HEADER PLACE`}
          </label>
          <div className="mt-4">
            <Input
              autoFocus={true}
              label={lable}
              placeholder={placeholder}
              name={'prompInput'}
              value={state.inputValue}
              onChange={_onChangeValue}
              onKeyDown={() => {}}
              onBlur={() => {}}
              error={state.error}
            />
          </div>
          <PathSelector
            onSelect={(folderId) => {
              // console.log({ folderId });
              setState((s) => ({ ...s, folderId }));
            }}
            folders={folders}
          />
          <TabHeader className="px-4">
            <TabHeader.Right>
              <Button
                text={texts?.btnCancle || `Cancel`}
                onClick={_close}
                sm
                secondary
                transparent
                ghost
              />
              <Button
                text={
                  state.isExecuting ? texts?.btnOking : texts?.btnOk || 'Create'
                }
                onClick={_onClickOk}
                disabled={state.isExecuting}
                primary
                sm
              />
            </TabHeader.Right>
          </TabHeader>
        </div>
      </Modal.Body>
    </Modal>
  );
};

const PathSelector: FC<{
  onSelect: (itemId: string) => void;
  folders: any[];
}> = ({ onSelect, folders = [] }) => {
  if (!folders?.length) return <></>;
  const rootOrders = folders
    .filter((i) => !i.__ref.folderId)
    .map((i) => i.__ref.id);
  const dataProvider = useRef(new TreeDataProvider(folders, rootOrders));
  const onItemSelect = (itemIds: string[], treeId: string) => {
    if (!itemIds?.length) return;
    onSelect(itemIds[0]);
  };

  return (
    <Container className="max-h-48 mb-14 !h-fit">
      <label className="text-appForeground text-sm mb-1 block">Save at</label>
      <div className="border border-appBorder">
        <Container.Body className="save-modal-collection pane-body  visible-scrollbar overflow-visible">
          <UncontrolledTreeEnvironment
            keyboardBindings={{
              // primaryAction: ['f3'],
              renameItem: ['enter', 'f2'],
              abortRenameItem: ['esc'],
            }}
            // dataProvider={new StaticTreeDataProvider(items, (item, data) => ({ ...item, data }))}
            dataProvider={dataProvider.current}
            onStartRenamingItem={(a) => {
              console.log(a, 'onStartRenamingItem');
            }}
            onSelectItems={onItemSelect}
            getItemTitle={(item) => item.data?.name}
            viewState={{}}
            // renderItemTitle={({ title }) => <span>{title}</span>}
            renderItemArrow={treeRenderer.renderItemArrow}
            // renderItemTitle={treeRenderer.renderItemTitle}
            renderItem={treeRenderer.renderItem}
            // renderTreeContainer={({ children, containerProps }) => <div {...containerProps}>{children}</div>}
            // renderItemsContainer={({ children, containerProps }) => <ul {...containerProps}>{children}</ul>}
          >
            <Tree
              treeId="selector-save-item"
              rootItem="root"
              treeLabel={'Save Item'}
            />
          </UncontrolledTreeEnvironment>
        </Container.Body>
        <Container.Header className="bg-focus2 !p-1 text-appForegroundInActive leading-3">
          Path
        </Container.Header>
      </div>
    </Container>
  );
};
