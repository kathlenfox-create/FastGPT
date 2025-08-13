'use client';
import MyBox from '@fastgpt/web/components/common/MyBox';
import DashboardContainer from '../../../pageComponents/dashboard/Container';
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
import type { Evaluator } from '@fastgpt/global/core/evaluation/type';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import PopoverConfirm from '@fastgpt/web/components/common/MyPopover/PopoverConfirm';

import { getEvaluatorList, deleteEvaluator, postTestEvaluator } from '@/web/core/evaluation/evaluation';

const EvaluationEvaluators = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const [searchKey, setSearchKey] = useState('');

  const {
    data: evaluatorList,
    Pagination,
    getData: fetchData
  } = usePagination(getEvaluatorList, {
    pageSize: 20,
    params: {
      searchKey
    },
    EmptyTip: <EmptyTip />,
    refreshDeps: [searchKey]
  });

  const { runAsync: onDeleteEvaluator } = useRequest2(deleteEvaluator, {
    onSuccess: () => {
      fetchData();
    }
  });

  const getEvaluatorTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      accuracy: 'green',
      semantic_similarity: 'blue',
      custom: 'purple',
      llm: 'orange'
    };
    return colorMap[type] || 'gray';
  };

  const columns = [
    {
      title: t('common:Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Evaluator) => (
        <Box
          cursor="pointer"
          color="primary.600"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => router.push(`/dashboard/evaluation/evaluators/${record.id}`)}
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
        <Badge colorScheme={getEvaluatorTypeColor(config.type)}>
          {config.type.replace('_', ' ').toUpperCase()}
        </Badge>
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
      render: (record: Evaluator) => (
        <Flex gap={2}>
          <MyTooltip label={t('common:Edit')}>
            <IconButton
              aria-label="Edit"
              icon={<MyIcon name="edit" w="14px" />}
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/evaluation/evaluators/${record.id}/edit`)}
            />
          </MyTooltip>
          <MyTooltip label={t('common:Test')}>
            <IconButton
              aria-label="Test"
              icon={<MyIcon name="play" w="14px" />}
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/evaluation/evaluators/${record.id}/test`)}
            />
          </MyTooltip>
          <PopoverConfirm
            onConfirm={() => onDeleteEvaluator(record.id)}
            title={t('common:Delete')}
            description={t('common:Delete Confirm')}
          >
            <MyTooltip label={t('common:Delete')}>
              <IconButton
                aria-label="Delete"
                icon={<MyIcon name="delete" w="14px" />}
                variant="ghost"
                size="sm"
                colorScheme="red"
              />
            </MyTooltip>
          </PopoverConfirm>
        </Flex>
      )
    }
  ];

  return (
    <DashboardContainer>
      <MyBox>
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Box fontSize="2xl" fontWeight="bold">
            {t('dashboard_evaluation:Evaluators')}
          </Box>
          <Button
            leftIcon={<MyIcon name="add" w="14px" />}
            onClick={() => router.push('/dashboard/evaluation/evaluators/create')}
          >
            {t('common:Create')}
          </Button>
        </Flex>

        <Flex mb={4}>
          <SearchInput
            placeholder={t('common:Search')}
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            onSearch={() => fetchData()}
          />
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
              {evaluatorList.map((evaluator: Evaluator) => (
                <Tr key={evaluator.id}>
                  {columns.map((column) => (
                    <Td key={column.key}>
                      {column.render
                        ? column.render(evaluator[column.dataIndex as keyof Evaluator], evaluator)
                        : evaluator[column.dataIndex as keyof Evaluator]}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        <Pagination />
      </MyBox>
    </DashboardContainer>
  );
};

export default EvaluationEvaluators;

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dashboard_evaluation', 'common']))
    }
  };
}
