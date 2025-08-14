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
  Badge,
  Progress
} from '@chakra-ui/react';
import SearchInput from '@fastgpt/web/components/common/Input/SearchInput';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRouter } from 'next/router';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { formatTime2YMDHM } from '@fastgpt/global/common/string/time';
import { usePagination } from '@fastgpt/web/hooks/usePagination';
import { useState } from 'react';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';
import type { EvalExperiment } from '@fastgpt/global/core/evaluation/type';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import PopoverConfirm from '@fastgpt/web/components/common/MyPopover/PopoverConfirm';

import {
  getEvalExperimentList,
  deleteEvalExperiment,
  postStartEvalExperiment,
  postCancelEvalExperiment
} from '@/web/core/evaluation/evaluation';

const EvaluationExperiments = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const [searchKey, setSearchKey] = useState('');

  // 适配器函数来匹配usePagination的参数格式
  const getExperimentListAdapter = async (params: any) => {
    return getEvalExperimentList({
      searchKey: params.searchKey || '',
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 20
    });
  };

  const {
    data: experimentList,
    Pagination,
    getData: fetchData
  } = usePagination(getExperimentListAdapter, {
    pageSize: 20,
    params: {
      searchKey
    },
    EmptyTip: <EmptyTip />,
    refreshDeps: [searchKey]
  });

  const { runAsync: onDeleteExperiment } = useRequest2(deleteEvalExperiment, {
    onSuccess: () => {
      fetchData();
    }
  });

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'gray',
      running: 'blue',
      completed: 'green',
      failed: 'red',
      cancelled: 'orange'
    };
    return colorMap[status] || 'gray';
  };

  const getProgressPercentage = (progress: any) => {
    if (!progress || progress.total === 0) return 0;
    return (progress.completed / progress.total) * 100;
  };

  const columns = [
    {
      title: t('common:Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: EvalExperiment) => (
        <Box
          cursor="pointer"
          color="primary.600"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => router.push(`/dashboard/evaluation/experiments/${record.id}`)}
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
      title: t('common:Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge colorScheme={getStatusColor(status)}>{status.toUpperCase()}</Badge>
      )
    },
    {
      title: t('common:Progress'),
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: any) => (
        <Box>
          <Progress
            value={getProgressPercentage(progress)}
            size="sm"
            colorScheme={getProgressPercentage(progress) === 100 ? 'green' : 'blue'}
            mb={1}
          />
          <Box fontSize="sm" color="gray.600">
            {progress?.completed || 0} / {progress?.total || 0}
          </Box>
        </Box>
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
      render: (record: EvalExperiment) => (
        <Flex gap={2}>
          <MyTooltip label={t('common:View')}>
            <IconButton
              aria-label="View"
              icon={<MyIcon name="common/viewLight" w="14px" />}
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/evaluation/experiments/${record.id}`)}
            />
          </MyTooltip>
          {record.status === 'pending' && (
            <MyTooltip label={t('common:Start')}>
              <IconButton
                aria-label="Start"
                icon={<MyIcon name="core/chat/chatLight" w="14px" />}
                variant="ghost"
                size="sm"
                colorScheme="green"
                onClick={() => router.push(`/dashboard/evaluation/experiments/${record.id}/start`)}
              />
            </MyTooltip>
          )}
          {(record.status === 'pending' || record.status === 'running') && (
            <MyTooltip label={t('common:Cancel')}>
              <IconButton
                aria-label="Cancel"
                icon={<MyIcon name="stop" w="14px" />}
                variant="ghost"
                size="sm"
                colorScheme="orange"
                onClick={() => router.push(`/dashboard/evaluation/experiments/${record.id}/cancel`)}
              />
            </MyTooltip>
          )}
          <PopoverConfirm
            onConfirm={() => onDeleteExperiment(record.id)}
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
              {t('dashboard_evaluation:Experiments')}
            </Box>
            <Button
              leftIcon={<MyIcon name="common/addLight" w="14px" />}
              onClick={() => router.push('/dashboard/evaluation/experiments/create')}
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
                {experimentList.map((experiment: EvalExperiment) => (
                  <Tr key={experiment.id}>
                    {columns.map((column) => (
                      <Td key={column.key}>
                        {column.render
                          ? column.render(
                              experiment[column.dataIndex as keyof EvalExperiment] as any,
                              experiment
                            )
                          : String(experiment[column.dataIndex as keyof EvalExperiment] || '')}
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

export default EvaluationExperiments;

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dashboard_evaluation', 'common']))
    }
  };
}
