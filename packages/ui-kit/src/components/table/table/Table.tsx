import { ColumnResizeMode, getCoreRowModel, useReactTable, flexRender, createColumnHelper } from '@tanstack/react-table';
import React, { FC, useEffect, useState, ReactNode, useRef } from 'react';
import TableDraggableRow from "./TableDraggableRow";
import cx from "classnames";
import "../../table-v3/primary-table/table.sass";
import classNames from 'classnames';

const Table: FC<ITable> = ({
    name = "",
    data = [],
    columns,
    tableResizable = false,
    columnRenderer = () => { },
    cellRenderer = () => { },
    tableWidth = 200,
    options = {}
}) => {

    const [tableData, setTableData] = useState(() => [])
    const [dragId, setDragId] = useState(0);


    const [columnResizeMode, setColumnResizeMode] = React.useState<ColumnResizeMode>('onChange')

    const columnHelper = createColumnHelper<any>()

    const columnDisplay = [
        ...columns.map(column => columnHelper.accessor(column.name,
            {
                id:  column.name,
                ...(typeof column.width !== "undefined" ? { size: column.width } : {}),
                ...(typeof column.maxSize !== "undefined" ? { maxSize: column.maxSize } : {}),
                minSize: (
                    typeof column.minSize !== "undefined" ? column.minSize : 
                            (typeof options.minColumnSize !== "undefined" ? options.minColumnSize :  50 )
                        ),
                enableResizing: (typeof column.enableResizing !== "undefined") ? column.enableResizing : false,
                header: (col) => {
                    return columnRenderer((typeof column.displayName !== "undefined" ? column.displayName : column.name))
                },
                cell: ({cell}) => {
                    let cellValue = cell.getValue();
                    if(cell.getValue() !== "undefined"){
                        return cellRenderer({cellValue, rowIndex : cell.row.index, columnId: cell.column.id,
                             columnSize: cell.column.getSize()
                            })
                    }else{
                        return<></>
                    }
                    
                },
            }
        ))
    ];

    const tableRef = useRef<HTMLTableElement>(null);

    useEffect(() => {
        setTableData(data)
        // console.log(`table-data-updated`, data);
    }, [data]);

    const table = useReactTable({
        data: tableData,
        columns: columnDisplay,
        enableColumnResizing: tableResizable,
        ...(tableResizable ? { columnResizeMode: columnResizeMode } : {}),
        getCoreRowModel: getCoreRowModel(),
    });


    function drag(rowIndex: number) {
        setDragId(rowIndex);
    }

    //reorder the index value for the table rows
    function drop(rowIndex: number) {
        tableData.splice(rowIndex, 0, tableData.splice(dragId, 1)[0])
        setTableData([...tableData])
    }

    return (
        <div className={cx(`w-full`, options.containerClassName)}>
                <table className="primary-table border border-appBorder mb-4"
                    id={name}
                    ref={tableRef}
                    style={{
                        minWidth: "100%",
                        width: table.getTotalSize()
                    }}>
                    <thead>

                        {table.getHeaderGroups().map(headerGroup =>
                            <tr className="border text-base text-left font-semibold bg-focus2" key={headerGroup.id}>
                                {
                                    headerGroup.headers.map(header => {
                                        return <Th key={header.id}
                                            className={classNames("overflow-hidden overflow-ellipsis whitespace-nowrap", 
                                            {"!w-[5%]": (header.id === "action")})}
                                            style={{
                                                minWidth: (header.id === "action") ?`${header.column.columnDef.minSize}px`: null, 
                                                width: header.getSize(),
                                                // minWidth: `${header.column.columnDef.minSize}px`, 
                                                // maxWidth: `${header.column.columnDef.maxSize}px`, 
                                            }}
                                        >
                                            {
                                                header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )
                                            }
                                            {
                                                header.column.getCanResize() && (
                                                    <div
                                                        onMouseDown={header.getResizeHandler()}
                                                        onTouchStart={header.getResizeHandler()}
                                                        className={`pt-resizer h-full ${header.column.getIsResizing() ? 'pt-resizing' : ''}`}
                                                    ></div>)
                                            }
                                        </Th>
                                    })
                                }
                            </tr>)}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => {
                            return <TableDraggableRow
                             key={row.original.key}
                             row={row} 
                            handleDrag={drag}
                            handleDrop={drop}
                            />
                        })}

                    </tbody>
                </table>
        </div>)
};

export default Table;
export type { ITable, ITableRow, TPlainObject }

const Th: FC<ITh> = ({ children = <></>, className = "", style = {} }) => {

    return (
        <th className={cx("p-1 border border-appBorder", className)} style={style}>
            {children}
        </th>
    )
}

export const Td: FC<ITd> = ({ children, className = "", style = {} }) => {
    return (
        <td className={cx("border-b border-l first:border-l-0 border-appBorder", className)} style={style}>
            {children}
        </td>
    )
}

type TPlainObject = { [K: string]: any }
type ITable = {
    name: string,
    data: Array<TPlainObject>,
    tableResizable: boolean,
    columns: Array<IColumn>,
    columnRenderer: (column: object | string) => string | JSX.Element,
    cellRenderer: (cell: object) => string | JSX.Element,
    tableWidth: number,
    options: TPlainObject
}
type IColumn = {
    name: string,
    displayName?: string,
    width?: number,
    minSize?:number,
    maxSize?:number,
    enableResizing?: boolean
}
type ITableRow = {
    row: TPlainObject,
    index?: number,
    handleDrop: Function,
    handleDrag: Function
}
type ITh = { children: ReactNode, className?: string, style?: TPlainObject }
type ITd = { children: ReactNode, className?: string, style?: TPlainObject }