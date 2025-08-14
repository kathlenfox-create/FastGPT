'use client';
import MyBox from '@fastgpt/web/components/common/MyBox';
import DashboardContainer from '@/pageComponents/dashboard/Container';
import { serviceSideProps } from '@/web/common/i18n/utils';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge
} from '@chakra-ui/react';
import SearchInput from '@fastgpt/web/components/common/Input/SearchInput';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRouter } from 'next/router';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { formatTime2YMDHM } from '@fastgpt/global/common/string/time';
import { usePagination } from '@fastgpt/web/hooks/usePagination';
import { useState } from 'react';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';
import type { EvalTarget } from '@fastgpt/global/core/evaluation/type';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import PopoverConfirm from '@fastgpt/web/components/common/MyPopover/PopoverConfirm';

import {
  getEvalTargetList,
  deleteEvalTarget,
  postTestEvalTarget
} from '@/web/core/evaluation/evaluation';

const EvaluationTargets = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const [searchKey, setSearchKey] = useState('');

  // 适配器函数来匹配usePagination的参数格式
  const getTargetListAdapter = async (params: any) => {
    return getEvalTargetList({
      searchKey: params.searchKey || '',
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 20
    });
  };

  const {
    data: targetList,
    Pagination,
    getData: fetchData
  } = usePagination(getTargetListAdapter, {
    pageSize: 20,
    params: {
      searchKey
    },
    EmptyTip: <EmptyTip />,
    refreshDeps: [searchKey]
  });

  const { runAsync: onDeleteTarget } = useRequest2(deleteEvalTarget, {
    onSuccess: () => {
      fetchData();
    }
  });

  const getTargetTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      mock: 'gray',
      http: 'blue',
      function: 'purple',
      app: 'green'
    };
    return colorMap[type] || 'gray';
  };

  const columns = [
    {
      title: t('common:Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: EvalTarget) => (
        <Box
          cursor="pointer"
          color="primary.600"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => router.push(`/dashboard/evaluation/targets/${record.id}`)}
        >
          {name}
        </Box>
      )
    },
    {
      title: t('common:Description'),
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || '-'
    },
    {
      title: t('common:Type'),
      dataIndex: 'config',
      key: 'type',
      render: (config: any) => (
        <Badge colorScheme={getTargetTypeColor(config.type)}>{config.type.toUpperCase()}</Badge>
      )
    },
    {
      title: t('common:Create Time'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: Date) => formatTime2YMDHM(time)
    },
    {
      title: t('common:Action'),
      key: 'action',
      render: (record: EvalTarget) => (
        <Flex gap={2}>
          <MyTooltip label={t('common:Edit')}>
            <IconButton
              aria-label="Edit"
              icon={<MyIcon name="common/edit" w="14px" />}
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/evaluation/targets/${record.id}/edit`)}
            />
          </MyTooltip>
          <MyTooltip label={t('common:Test')}>
            <IconButton
              aria-label="Test"
              icon={<MyIcon name="core/chat/chatLight" w="14px" />}
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/evaluation/targets/${record.id}/test`)}
            />
          </MyTooltip>
          <PopoverConfirm
            onConfirm={() => onDeleteTarget(record.id)}
            content={t('common:Delete Confirm')}
            type="delete"
            Trigger={
              <MyTooltip label={t('common:Delete')}>
                <IconButton
                  aria-label="Delete"
                  icon={<MyIcon name="common/trash" w="14px" />}
                  variant="ghost"
                  size="sm"
                  colorScheme="red"
                />
              </MyTooltip>
            }
          />
        </Flex>
      )
    }
  ];

  return (
    <DashboardContainer>
      {({ MenuIcon }) => (
        <MyBox>
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Box fontSize="2xl" fontWeight="bold">
              {t('dashboard_evaluation:Evaluation_Targets')}
            </Box>
            <Button
              leftIcon={<MyIcon name="common/addLight" w="14px" />}
              onClick={() => router.push('/dashboard/evaluation/targets/create')}
            >
              {t('common:Create')}
            </Button>
          </Flex>

          <Flex mb={4}>
            <SearchInput
              placeholder={t('common:Search')}
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
            />
            <Button onClick={() => fetchData()} size="sm" ml={2}>
              {t('common:Search')}
            </Button>
          </Flex>

          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  {columns.map((column) => (
                    <Th key={column.key}>{column.title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {targetList.map((target: EvalTarget) => (
                  <Tr key={target.id}>
                    {columns.map((column) => (
                      <Td key={column.key}>
                        {column.render
                          ? column.render(
                              target[column.dataIndex as keyof EvalTarget] as any,
                              target
                            )
                          : String(target[column.dataIndex as keyof EvalTarget] || '')}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          <Pagination />
        </MyBox>
      )}
    </DashboardContainer>
  );
};

export default EvaluationTargets;

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dashboard_evaluation', 'common']))
    }
  };
}
